// attachAccessToken.ts
import { Response, NextFunction } from 'express';
import { getLogger } from '../config/logger';
import { getUserSessionRedis, deleteUserSessionRedis } from '../services/redisService';
import { revokeRefreshTokenPrisma } from '../services/prismaUserService';
import { SessionRequest } from '../types/request';

const logger = getLogger('Session-Middleware');

export const sessionHandler = async (req: SessionRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      logger.warn('No sessionId cookie found');
      return res.status(401).json({ success: false, message: 'Unauthorized: No session' });
    }

    const { sessionData, active } = await getUserSessionRedis(sessionId);

    if (!sessionData) {
      logger.warn('Session not found in Redis', { sessionId });
      res.clearCookie('sessionId');
      return res.status(401).json({ error: 'Session not found or expired' });
    }

    if (!active) {
      logger.info('Session expired due to inactivity', { sessionId });
      try {
        await revokeRefreshTokenPrisma(sessionId, sessionData.userId);
      } catch (e) {
        logger.warn('Failed to revoke refresh token on inactivity', { sessionId, err: e });
      }
      try {
        await deleteUserSessionRedis(sessionId);
      } catch (e) {
        logger.warn('Failed to delete Redis session on inactivity', { sessionId, err: e });
      }
      res.clearCookie('sessionId');
      return res.status(401).json({ error: 'Session expired due to inactivity' });
    }

    // Inject token into Authorization header
    req.sessionId = sessionId;
    req.session = sessionData;
    req.headers.authorization = `Bearer ${sessionData.accessToken}`;

    logger.debug('Access token injected into request header', { sessionId });

    next();
  } catch (err: any) {
    logger.error('Failed to attach access token', { error: err.message });
    const status = err.message.includes('Redis') ? 401 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};
