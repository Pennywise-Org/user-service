import { decodeAccessToken, verifyAccessToken, verifyIdToken } from './tokenService';
import {
  fetchRefreshTokenPrisma,
  revokeRefreshTokenPrisma,
  saveRefreshTokenPrisma,
  saveUserPrimsa,
} from './prismaUserService';
import {
  deleteUserSessionRedis,
  getUserSessionRedis,
  saveUserSessionRedis,
  saveManagementAPITokenRedis,
} from './redisService';
import { getLogger } from '../config/logger';
import axios from 'axios';
import qs from 'qs';
import { setDefaultUserSettings } from './userService';
import { env } from '../config/env';

const logger = getLogger('Auth-Service');

// Environment variables

/**
 * Build the Auth0 authorization URL
 */
export const buildAuthorizeURL = (state: string) => {
  return (
    `${env.AUTH0_DOMAIN}/authorize?audience=${env.AUDIENCE}` +
    `&scope=${encodeURIComponent(env.AUTH0_SCOPE)}` +
    `&response_type=code` +
    `&client_id=${env.AUTH0_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(env.AUTH0_REDIRECT_URI)}` +
    `&state=${state}`
  );
};

/**
 * Handle Auth0 callback:
 * 1. Exchange code for tokens
 * 2. Verify ID & Access tokens
 * 3. Save user in DB
 * 4. Store session in Redis
 */
export const authCallbackService = async (code: string) => {
  logger.info('Starting Auth0 callback service: exchanging authorization code', { code });
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.AUTH0_REDIRECT_URI,
    client_id: env.AUTH0_CLIENT_ID,
    client_secret: env.AUTH0_CLIENT_SECRET,
  });

  try {
    const tokenResp = await axios.post(`${env.AUTH0_DOMAIN}/oauth/token`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (tokenResp.status !== 200) {
      logger.error('Failed to exchange authorization code with Auth0', {
        status: tokenResp.status,
      });
      throw new Error(`Auth0 token exchange failed with status ${tokenResp.status}`);
    }

    logger.info('Successfully received tokens from Auth0');
    const { access_token, refresh_token, id_token } = tokenResp.data;

    const decodedIDToken = await verifyIdToken(id_token);
    await verifyAccessToken(access_token);
    const decodedAccessToken = await decodeAccessToken(access_token);

    const firstLogin = decodedAccessToken?.['https://pennywise.app/firstLogin'] === true;
    if (firstLogin) {
      await saveUserPrimsa(decodedIDToken);
      await setDefaultUserSettings(decodedIDToken.sub);
    }

    const sessionId = await saveUserSessionRedis(decodedIDToken.sub, access_token);
    await saveRefreshTokenPrisma(sessionId, refresh_token, decodedIDToken.sub);

    if (!sessionId) {
      throw new Error('Failed to store session in Redis');
    }

    return sessionId;
  } catch (err) {
    logger.error('Auth0 callback service failed', { err });
    throw err;
  }
};

/**
 * logoutService
 * -------------
 * Logs out the user by:
 *  1. Deleting their Redis session.
 *  2. Revoking their refresh token in the database.
 *  3. Redirecting them to Auth0's logout endpoint (clears Auth0 session).
 */
export const logoutService = async (sessionId: string): Promise<void> => {
  try {
    // Step 1: Try to fetch session
    const { sessionData } = await getUserSessionRedis(sessionId);

    if (sessionData && sessionData.user_id) {
      await revokeRefreshTokenPrisma(sessionId, sessionData.user_id);
      logger.info('Refresh token revocation completed', { sessionId });
    } else {
      logger.warn('No session found in Redis. Skipping refresh token revocation.', { sessionId });
    }

    // Step 2: Delete session from Redis (non-blocking logout if this fails)
    try {
      await deleteUserSessionRedis(sessionId);
      logger.info('Redis session deletion completed', { sessionId });
    } catch (err) {
      logger.warn('Redis session deletion failed', { err, sessionId });
    }

    // Step 3: Logout from Auth0
    const logoutUrl = `${env.AUTH0_DOMAIN}/v2/logout?client_id=${env.AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(env.AUTH0_LOGOUT_URL)}`;
    await axios.get(logoutUrl);
    logger.info('User successfully logged out from Auth0 and Redis', { sessionId });
  } catch (err) {
    logger.error('Logout service failed', { err, sessionId });
    throw err;
  }
};

/**
 * refreshTokenService
 * --------------------
 * Attempts to:
 *  1. Fetch the current (non-revoked, non-expired) refresh token from the DB.
 *  2. Use it to get a new access + refresh token pair from Auth0.
 *  3. Store the new session and refresh token securely.
 *  4. Revoke the old refresh token.
 */
export const refreshTokenService = async (auth0Id: string, sessionId: string) => {
  logger.info('Starting token refresh process', { auth0Id, sessionId });

  try {
    // Step 1: Get old refresh token
    logger.debug('Fetching refresh token from database', { sessionId });
    const oldRefreshToken = await fetchRefreshTokenPrisma(sessionId, auth0Id);
    logger.info('Fetched existing refresh token', { sessionId });

    // Step 2: Prepare request
    const data = qs.stringify({
      grant_type: 'refresh_token',
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      refresh_token: oldRefreshToken,
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${env.AUTH0_DOMAIN}/oauth/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data,
    };

    logger.info('Sending token refresh request to Auth0', { sessionId });

    // Step 3: Send request
    const response = await axios.request(config);
    const { access_token, refresh_token } = response.data;

    logger.info('Received response from Auth0', {
      sessionId,
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
    });

    if (!access_token || !refresh_token) {
      logger.error('Missing tokens in Auth0 response', { sessionId });
      throw new Error('Auth0 did not return valid tokens');
    }

    // Step 4: Verify and persist new tokens
    logger.debug('Verifying new access token', { sessionId });
    await verifyAccessToken(access_token);

    logger.debug('Saving new session in Redis', { sessionId });
    await saveUserSessionRedis(auth0Id, access_token, sessionId);

    logger.debug('Rotating refresh token in DB', { sessionId });
    await saveRefreshTokenPrisma(sessionId, refresh_token, auth0Id, oldRefreshToken);

    logger.info('Refresh token process completed successfully', { sessionId });
    return access_token;
  } catch (err) {
    logger.error('Refresh token process failed', {
      sessionId,
      auth0Id,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};

/**
 * Retrieves a fresh Auth0 Management API access token using client credentials grant,
 * verifies it (optional), and stores it in Redis for reuse until it expires.
 */
export const getManagementAPIToken = async () => {
  // Prepare form-encoded data for the client credentials grant
  const data = qs.stringify({
    grant_type: 'client_credentials',
    client_id: env.MANAGEMENT_API_CLIENT_ID,
    client_secret: env.MANAGEMENT_API_CLIENT_SECRET,
    audience: env.MANAGEMENT_API_AUDIENCE,
  });

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${env.AUTH0_DOMAIN}/oauth/token`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    data,
  };

  logger.info('Requesting new Management API token from Auth0');

  try {
    // Send the token request to Auth0
    const response = await axios.request(config);
    const { access_token, expires_in } = response.data;

    logger.info('Received Management API token from Auth0', {
      expires_in,
    });

    // Optional: Validate the structure and claims of the token
    await verifyAccessToken(access_token);

    // Cache the token in Redis with its expiry
    await saveManagementAPITokenRedis(access_token, expires_in);

    logger.info('Stored Management API token in Redis cache');

    return access_token;
  } catch (err) {
    logger.error('Failed to fetch Management API token from Auth0', {
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};
