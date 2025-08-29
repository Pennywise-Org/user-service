import { Response, NextFunction } from 'express';
import { SessionRequest } from '../types/request';
import { maybeRefreshAccessToken } from '../lib/session/refreshAccessToken';
import { getLogger } from '../config/logger';

const logger = getLogger('Refresh-Token-Middleware');

/**
 * Middleware to refresh access token if it’s close to expiring.
 * Injects the new access token into the Authorization header.
 * Also re-issues the session cookie if token is refreshed.
 */
export const refreshToken = async (req: SessionRequest, res: Response, next: NextFunction) => {
  const sessionId = req.sessionId;
  const sessionData = req.session;

  // Validate presence of session and expiration timestamp
  if (!sessionId || !sessionData || typeof sessionData.accessExp !== 'number') {
    logger.warn('Invalid or missing session data', {
      sessionId,
      sessionData,
    });
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    logger.debug('Checking if access token needs refresh', {
      sessionId,
      userId: sessionData.userId,
      accessExp: sessionData.accessExp,
    });

    const { refreshed, accessToken } = await maybeRefreshAccessToken(sessionId, sessionData);

    // Inject updated token into Authorization header for downstream use
    req.headers.authorization = `Bearer ${accessToken}`;

    if (refreshed) {
      // Re-issue session cookie to keep session alive
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      logger.info('Access token refreshed and session cookie reissued', {
        sessionId,
        userId: sessionData.userId,
      });
    } else {
      logger.debug('Access token still valid. Skipping refresh.', {
        sessionId,
        userId: sessionData.userId,
      });
    }

    return next();
  } catch (err: any) {
    logger.error('Failed to refresh access token', {
      sessionId,
      userId: sessionData?.userId,
      error: err.message,
      stack: err.stack,
    });

    // Gracefully continue without breaking request flow
    return next();
  }
};
