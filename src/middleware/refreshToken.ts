import { Response, NextFunction } from 'express';
import { getLogger } from '../config/logger';
import { refreshTokenService } from '../services/authService';
import { SessionRequest } from '../types/request';

const logger = getLogger('Refresh-Token-Middleware');
const REFRESH_TOKEN_WINDOW = Number(process.env.REFRESH_TOKEN_WINDOW) || 1 * 60 * 1000;

export const refreshToken = async (req: SessionRequest, res: Response, next: NextFunction) => {
  const sessionId = req.sessionId;
  const sessionData = req.session;

  if (!sessionId) {
    logger.warn('Missing sessionId cookie');
    return res.status(401).json({ success: false, message: 'Unauthorized: No session ID' });
  }

  if (!sessionData || typeof sessionData.accessExp !== 'number') {
    logger.warn('Session data or accessExp missing or invalid', {
      sessionId,
      sessionData,
    });
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid session data' });
  }

  try {
    const expiryTime = parseInt(sessionData.accessExp) * 1000;
    const currentTime = Date.now();
    const timeLeft = expiryTime - currentTime;

    logger.debug('Checking if access token needs refreshing', {
      sessionId,
      userId: sessionData.userId,
      accessExp: sessionData.accessExp,
      currentTime,
      timeLeft,
    });

    if (timeLeft <= REFRESH_TOKEN_WINDOW) {
      logger.info('Access token near expiry. Refreshing...', {
        sessionId,
        userId: sessionData.userId,
      });

      const newAccessToken = await refreshTokenService(sessionData.userId as string, sessionId);
      req.headers.authorization = `Bearer ${newAccessToken}`;

      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      });

      logger.info('Access token refreshed and session cookie updated', {
        sessionId,
      });
    } else {
      logger.debug('Access token still valid. No refresh performed.', {
        sessionId,
        timeLeft,
      });
    }

    return next();
  } catch (error: any) {
    logger.error('Error during refreshToken middleware', {
      sessionId,
      userId: sessionData?.userId,
      error: error.message,
      stack: error.stack,
    });
    return next();
  }
};
