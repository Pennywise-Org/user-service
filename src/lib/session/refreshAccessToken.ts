import { refreshTokenService } from '../../services/authService';
import { sessionData } from '../../types/userSession';
import { getLogger } from '../../config/logger';

const logger = getLogger('Refresh-Helper');

// Refresh token if expiry is within the defined window
const REFRESH_TOKEN_WINDOW = Number(process.env.REFRESH_TOKEN_WINDOW) || 1 * 60 * 1000;

/**
 * Check if the access token is close to expiry, and refresh it if needed.
 *
 * @param sessionId - The ID of the user's session (from Redis or cookie)
 * @param sessionData - The session payload containing accessToken and accessExp
 * @returns A flag indicating if refresh occurred and the access token to use
 */
export async function maybeRefreshAccessToken(
  sessionId: string,
  sessionData: sessionData
): Promise<{ refreshed: boolean; accessToken: string }> {
  try {
    const expiryTime = sessionData.accessExp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeLeft = expiryTime - currentTime;

    logger.debug('Checking access token expiration', {
      sessionId,
      userId: sessionData.userId,
      accessExp: sessionData.accessExp,
      currentTime,
      timeLeft,
      refreshWindow: REFRESH_TOKEN_WINDOW,
    });

    // If token is nearing expiration, refresh it
    if (timeLeft <= REFRESH_TOKEN_WINDOW) {
      logger.info('Access token is near expiry. Refreshing...', {
        sessionId,
        userId: sessionData.userId,
      });

      const newAccessToken = await refreshTokenService(sessionData.userId, sessionId);

      logger.info('Access token refreshed successfully', {
        sessionId,
        userId: sessionData.userId,
      });

      return { refreshed: true, accessToken: newAccessToken };
    }

    // Token is still valid, return as-is
    logger.debug('Access token still valid. No refresh needed.', {
      sessionId,
      timeLeft,
    });

    return { refreshed: false, accessToken: sessionData.accessToken };
  } catch (error: any) {
    logger.error('Failed to refresh access token', {
      sessionId,
      userId: sessionData.userId,
      error: error.message,
      stack: error.stack,
    });

    // Gracefully fall back to existing token
    return { refreshed: false, accessToken: sessionData.accessToken };
  }
}
