import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import jwksClient from 'jwks-rsa';
import { getLogger } from '../config/logger';
import { env } from '../config/env';

const logger = getLogger('Token-Service');

const client = jwksClient({
  jwksUri: `${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

// Helper for JWKS Key
const getKey = (header, callback): void => {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      logger.error('Failed to retrieve signing key from JWKS', { err, kid: header.kid });
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    logger.debug('JWKS signing key successfully retrieved', { kid: header.kid });
    callback(null, signingKey);
  });
};

/**
 *  Verify ID Token (returns decoded payload)
 */
export const verifyIdToken = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.AUTH0_CLIENT_ID,
        issuer: `${process.env.AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          logger.error('ID token verification failed', { err });
          return reject(err);
        }
        logger.info('ID token verified successfully', { user: decoded?.sub });
        resolve(decoded);
      }
    );
  });
};

/**
 *  Verify Access Token (returns true/false)
 */
export const verifyAccessToken = (token: string): Promise<any> => {
  logger.info('Attempting to verify access token');
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.AUDIENCE,
        issuer: `${process.env.AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err) => {
        if (err) {
          logger.warn('Access token verification failed', { err });
          return reject(err);
        }
        logger.info('Access token verified successfully');
        resolve(true);
      }
    );
  });
};

/**
 * Decodes a JWT access token without verifying its signature.
 * Used strictly for reading claims like expiry or subject (sub).
 *
 * @param accessToken - The JWT access token
 * @returns The decoded token payload
 * @throws Error if the token is invalid or cannot be decoded
 */
export const decodeAccessToken = (accessToken: string): jwt.JwtPayload => {
  logger.info('Attempting to decode access token');

  try {
    // console.log("access_token",accessToken);
    const decoded = jwt.decode(accessToken);
    // console.log("decoded",decoded);
    if (!decoded || typeof decoded !== 'object') {
      logger.error('Access token decode returned null or non-object');
      const err = new Error('Failed to decode access token: token is malformed or empty');
      (err as any).statusCode = 400;
      throw err;
    }

    const { sub, exp } = decoded;
    logger.info('Access token decoded successfully', {
      user: sub ?? 'unknown',
      expiresAt: exp ? new Date(exp * 1000).toISOString() : 'no expiry claim',
    });

    return decoded;
  } catch (err) {
    logger.error('Exception occurred while decoding access token', {
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};

export const generateStateToken = (): string => {
  logger.info('Generating a JWT using state secret');
  return jwt.sign({ jti: crypto.randomBytes(8).toString('hex') }, env.STATE_SECRET, {
    expiresIn: '5m',
  });
};

export const verifyStateToken = (token: string): boolean => {
  try {
    if (jwt.verify(token, env.STATE_SECRET)) {
      logger.info('JWT verified successfully');
      return true;
    } else {
      logger.error('JWT was not verified successfully.');
      return false;
    }
  } catch {
    return false;
  }
};
