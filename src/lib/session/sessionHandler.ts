import { getUserSessionRedis, deleteUserSessionRedis } from '../../services/redisService';
import { revokeRefreshTokenPrisma } from '../../services/prismaUserService';
import { getLogger } from '../../config/logger';
import { sessionData, sessionStatus } from '../../types/userSession';

const logger = getLogger('Session-Handler-Helper');

/**
 * Fetches session data from Redis and checks if it's active.
 * - If session not found → return NotFound
 * - If session expired → revoke token, delete Redis session, return Expired
 * - If session is active → return Valid and sessionData
 */
export const getValidSessionOrRevoke = async (
  sessionId: string
): Promise<{ success: boolean; code: sessionStatus; sessionData?: sessionData }> => {
  try {
    // Step 1: Fetch session data from Redis
    const { sessionData, active } = await getUserSessionRedis(sessionId);

    // Step 2: Handle session not found
    if (!sessionData) {
      logger.warn('Session not found in Redis', { sessionId });
      return { success: false, code: sessionStatus.NotFound };
    }

    // Step 3: Handle session expired due to inactivity
    if (!active) {
      logger.info('Session expired due to inactivity', { sessionId });

      try {
        await revokeRefreshTokenPrisma(sessionId, sessionData.userId);
        logger.info('Refresh token revoked successfully', { sessionId });
      } catch (e) {
        logger.warn('Failed to revoke refresh token', {
          sessionId,
          userId: sessionData.userId,
          error: (e as Error).message,
        });
      }

      try {
        await deleteUserSessionRedis(sessionId);
        logger.info('Session deleted from Redis', { sessionId });
      } catch (e) {
        logger.warn('Failed to delete session from Redis', {
          sessionId,
          error: (e as Error).message,
        });
      }

      return { success: false, code: sessionStatus.Expired };
    }

    // Step 4: Session is valid and active
    logger.debug('Session is valid and active', { sessionId });
    return { success: true, code: sessionStatus.Valid, sessionData };
  } catch (err: any) {
    logger.error('Unexpected error in getValidSessionOrRevoke', {
      sessionId,
      error: err.message,
      stack: err.stack,
    });
    // Graceful fallback — assume session invalid
    return { success: false, code: sessionStatus.NotFound };
  }
};
