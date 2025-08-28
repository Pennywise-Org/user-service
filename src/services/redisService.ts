import redisClient from '../clients/redisClient';
import { randomUUID } from 'crypto';
import { getLogger } from '../config/logger';
import { decodeAccessToken } from './tokenService';
import { env } from '../config/env';
import { sessionData } from '../types/userSession';

const logger = getLogger('Session-Service');

/**
 * Save user session to Redis
 * - Stores access_token and refresh_token with TTL
 * - Returns generated sessionID
 */
/**
 * Save user session to Redis.
 *
 * Stores access token and user identifier under a session key with TTL.
 * Also sets an inactivity key to allow sliding session expiration.
 *
 * @param auth0Id - User identifier from Auth0
 * @param access_token - Access token to store
 * @param sessionId - Optional session ID (auto-generated if not provided)
 * @returns sessionId - The ID under which the session was stored
 */
export const saveUserSessionRedis = async (
  auth0Id: string,
  access_token: string,
  sessionId?: string
): Promise<string> => {
  if (!sessionId) {
    sessionId = randomUUID();
  }

  logger.info('Saving user session in Redis...');
  // Decode access token to extract expiration
  const { exp } = decodeAccessToken(access_token) as { exp?: number };
  if (!exp || typeof exp !== 'number') {
    logger.warn('Access token missing exp; refusing to persist session', { sessionId });
    throw Object.assign(new Error('Invalid access token: missing exp'), { cause: null });
  }

  // Calculate TTL based on token expiry and configured max TTL
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsUntilExp = Math.max(exp - nowSec, 1);
  const effectiveTtl = Math.max(1, Math.min(env.TTL, secondsUntilExp));

  const key = `session:${sessionId}`;
  const inactivityKey = `${key}:active`;

  logger.info('Saving user session to Redis', {
    sessionId,
    auth0Id,
    ttl: effectiveTtl,
    inactivityTimeout: env.INACTIVITY_TIMEOUT,
  });

  try {
    await redisClient.set(
      key,
      JSON.stringify({
        accessToken: access_token,
        userId: auth0Id,
        accessExp: exp,
      }),
      { EX: effectiveTtl }
    );

    await redisClient.set(inactivityKey, '1', { EX: env.INACTIVITY_TIMEOUT });

    logger.debug('Session and inactivity keys set in Redis', {
      sessionKey: key,
      inactivityKey,
    });

    logger.info('User session stored successfully in Redis', { sessionId });
    return sessionId;
  } catch (err) {
    logger.error('Failed to store user session in Redis', {
      sessionId,
      error: err instanceof Error ? err.message : err,
    });

    throw Object.assign(new Error(`Redis save failed for sessionID ${sessionId}`), { cause: err });
  }
};

/**
 * Fetch user session from Redis.
 *
 * Retrieves session payload and determines whether the session is active
 * based on the existence and TTL of an inactivity key.
 *
 * @param sessionId - The session ID to look up
 * @returns An object with sessionData and `active: boolean` indicating session activity
 * @throws Error if the session key is not found or Redis fails
 */
export const getUserSessionRedis = async (
  sessionId: string
): Promise<{
  sessionData: sessionData;
  active: boolean;
}> => {
  const key = `session:${sessionId}`;
  const activeKey = `${key}:active`;

  logger.debug('Attempting to retrieve session from Redis', { sessionId });

  try {
    const sessionDataJson = await redisClient.get(key);

    if (!sessionDataJson) {
      logger.warn('Session not found in Redis', { sessionId });
      throw new Error('Session data not found');
    }

    const sessionData = JSON.parse(sessionDataJson);
    logger.debug('Session data successfully parsed', { sessionId });

    let isActive = false;
    const activeVal = await redisClient.get(activeKey);

    if (activeVal) {
      const ttlMs = await redisClient.pTTL(activeKey);

      if (ttlMs === -2) {
        logger.debug('Inactivity key not found; session is inactive', { sessionId });
        isActive = false;
      } else {
        isActive = true;

        // Extend sliding window if needed
        if (ttlMs === -1 || ttlMs < 180_000) {
          await redisClient.expire(activeKey, env.INACTIVITY_TIMEOUT);
          logger.debug('Extended inactivity window on session', {
            sessionId,
            timeoutSec: env.INACTIVITY_TIMEOUT,
          });
        }
      }
    } else {
      logger.debug('Inactivity key not present; session considered inactive', { sessionId });
    }

    logger.info('Session retrieved successfully from Redis', { sessionId, isActive });

    return { sessionData, active: isActive };
  } catch (err: any) {
    logger.error('Failed to retrieve session from Redis', {
      sessionId,
      error: err instanceof Error ? err.message : err,
    });

    throw Object.assign(
      new Error(`Unable to retrieve session from Redis for sessionId: ${sessionId}`),
      { cause: err }
    );
  }
};

/**
 * Delete a user session and its inactivity key from Redis.
 *
 * Attempts to remove both the session data key and its associated inactivity key.
 *
 * @param sessionId - The session ID to delete
 * @returns True if at least one key was deleted; false if neither existed
 * @throws Error if Redis operation fails
 */
export const deleteUserSessionRedis = async (sessionId: string): Promise<boolean> => {
  const key = `session:${sessionId}`;
  const activeKey = `${key}:active`;

  logger.debug('Attempting to delete session from Redis', { sessionId });

  try {
    const deletedMain = await redisClient.unlink(key);
    const deletedActive = await redisClient.unlink(activeKey);

    if (deletedMain > 0 || deletedActive > 0) {
      logger.info('Successfully deleted session keys from Redis', {
        sessionId,
        deletedMain,
        deletedActive,
      });
      return true;
    } else {
      logger.warn('No session keys found to delete in Redis', { sessionId });
      return false;
    }
  } catch (err) {
    logger.error('Redis error during session deletion', {
      sessionId,
      error: err instanceof Error ? err.message : err,
    });

    throw Object.assign(new Error(`Redis deletion failed for session ${sessionId}`), {
      cause: err,
    });
  }
};

/**
 * Update an existing user session in Redis.
 *
 * Overwrites the session data and resets the TTL to the configured value.
 *
 * @param sessionId - The session ID to update
 * @param session - The new session object to persist
 * @throws Error if Redis write operation fails
 */
export const updateUserSessionRedis = async (sessionId: string, session: any): Promise<void> => {
  const key = `session:${sessionId}`;

  logger.info('Attempting to update user session in Redis', { sessionId });

  try {
    await redisClient.set(key, JSON.stringify(session), { EX: env.TTL });

    logger.info('User session updated successfully in Redis', {
      sessionId,
      ttl: env.TTL,
    });
  } catch (err) {
    logger.error('Redis error during session update', {
      sessionId,
      error: err instanceof Error ? err.message : err,
    });

    throw Object.assign(new Error(`Failed to update Redis session for ${sessionId}`), {
      cause: err,
    });
  }
};

/**
 * Save the Auth0 Management API access token in Redis with an expiry.
 *
 * Overwrites the existing token, if any. The TTL is set based on the token's lifetime.
 *
 * @param accessToken - The token to store
 * @param expiresIn - Time (in seconds) until the token expires
 * @throws Error if Redis write operation fails
 */
export const saveManagementAPITokenRedis = async (accessToken: string, expiresIn: number) => {
  const key = env.MANAGEMENT_API_KEY;

  logger.info('Attempting to store Management API access token in Redis');

  try {
    await redisClient.set(key, JSON.stringify(accessToken), { EX: expiresIn });

    logger.info('Management API access token saved to Redis successfully', {
      key,
      expiresIn,
    });
  } catch (err) {
    logger.error('Redis error while saving Management API access token', {
      key,
      error: err instanceof Error ? err.message : err,
    });

    throw Object.assign(new Error('Failed to save Management API access token to Redis'), {
      cause: err,
    });
  }
};

/**
 * Retrieve the Auth0 Management API access token from Redis.
 *
 * @returns The cached access token string
 * @throws Error if the token is not found or Redis access fails
 */
export const getManagementAPITokenRedis = async () => {
  const key = env.MANAGEMENT_API_KEY;

  logger.info('Attempting to retrieve Management API access token from Redis', { key });

  try {
    const accessTokenJson = await redisClient.get(key);

    if (!accessTokenJson) {
      logger.warn('Management API access token not found in Redis', { key });
      throw new Error('No cached Management API access token available');
    }

    logger.info('Successfully retrieved Management API access token from Redis', { key });
    return JSON.parse(accessTokenJson);
  } catch (err) {
    logger.error('Redis error while retrieving Management API access token', {
      key,
      error: err instanceof Error ? err.message : err,
    });

    throw Object.assign(new Error('Failed to retrieve Management API access token from Redis'), {
      cause: err,
    });
  }
};
