import { Request, Response } from 'express';
import { authCallbackService, buildAuthorizeURL, logoutService } from '../services/authService';
import { getLogger } from '../config/logger';
import { generateStateToken, verifyStateToken } from '../services/tokenService';

const logger = getLogger('Auth-Controller');
const logoutUrl = process.env.AUTH0_LOGOUT_URL!;

/**
 * Controller: authorizeController
 * --------------------------------
 * Initiates the Authorization Code Flow by generating a state token
 * and redirecting the user to the Auth0 authorization endpoint.
 */
export const authorizeController = (req: Request, res: Response) => {
  try {
    const state = generateStateToken();
    const authUrl = buildAuthorizeURL(state);
    logger.info('Redirecting user to Auth0 authorize URL', { path: req.originalUrl, state });
    res.redirect(authUrl);
  } catch (err) {
    logger.error('Error during authorization redirect', { err });
    res.status(500).json({ error: 'Failed to initiate authentication', success: false });
  }
};

/**
 * Controller: callbackController
 * -------------------------------
 * Handles the Auth0 callback:
 *  1. Verifies the state parameter.
 *  2. Exchanges the authorization code for tokens via authCallbackService.
 *  3. Creates a secure session cookie.
 *  4. Returns a success response or handles any errors gracefully.
 */
export const callbackController = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const { state } = req.query;

    logger.info('Received callback from Auth0', { path: req.originalUrl, state });

    if (typeof state !== 'string') {
      logger.warn('Missing or invalid state parameter', { path: req.originalUrl });
      return res.status(400).json({ error: 'Invalid state parameter', success: false });
    }

    if (!verifyStateToken(state)) {
      logger.warn('State token verification failed', { state });
      return res.status(400).json({ error: 'Invalid or expired state token', success: false });
    }

    const sessionId = await authCallbackService(code);

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90000 * 1000,
    });

    logger.info('Session created and cookie set successfully', { sessionId });
    return res.status(200).json({ message: 'Authentication successful', success: true });
  } catch (err) {
    logger.error('Authentication callback failed', { err });
    return res.status(500).json({ error: 'Authentication failed', success: false });
  }
};

/**
 * Controller: logoutController
 * -----------------------------
 * Handles logout by:
 *  1. Deleting the user's session from Redis (via logoutService).
 *  2. Clearing the session cookie.
 *  3. Redirecting the user to the configured Auth0 logout URL.
 */
export const logoutController = async (req: Request, res: Response) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    logger.info('No sessionId cookie found. User is already logged out.');
    return res.status(204).end(); // No Content
  }

  try {
    await logoutService(sessionId);
  } catch (err) {
    logger.warn('Logout service failed, but proceeding to clear cookie and redirect', { err });
  }

  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  logger.info('Session cookie cleared. Redirecting to Auth0 logout', { sessionId });
  return res.redirect(logoutUrl);
};
