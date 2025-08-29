// attachAccessToken.ts
import { Response, NextFunction } from 'express';
import { getLogger } from '../config/logger';
import { SessionRequest } from '../types/request';
import { getValidSessionOrRevoke } from '../lib/session/sessionHandler';
import { sessionStatus } from '../types/userSession';

const logger = getLogger('Session-Middleware');

export const sessionHandler = async (req: SessionRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      logger.warn('No sessionId cookie found');
      return res.status(401).json({ success: false, message: 'Unauthorized: No session' });
    }

    const { success, code, sessionData } = await getValidSessionOrRevoke(sessionId);

    if (!success) {
      if (code === sessionStatus.NotFound) {
        logger.warn('Session not found. Clearing Cookie...', { sessionId });
        res.clearCookie('sessionId');
        return res.status(401).json({ error: 'Session not found or expired' });
      } else if (code === sessionStatus.Expired) {
        res.clearCookie('sessionId');
        return res.status(401).json({ error: 'Session expired due to inactivity' });
      }
    }

    // Inject token into Authorization header
    req.sessionId = sessionId;
    req.session = sessionData;
    req.headers.authorization = `Bearer ${sessionData?.accessToken}`;

    logger.debug('Access token injected into request header', { sessionId });

    next();
  } catch (err: any) {
    logger.error('Failed to attach access token', { error: err.message });
    const status = err.message.includes('Redis') ? 401 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};
