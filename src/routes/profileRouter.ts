import express from 'express';
import { claimIncludes } from 'express-oauth2-jwt-bearer';
import { checkJwt } from '../middleware/authMiddleware';
import {
  getUserStatusController,
  getProfileController,
  updateProfileController,
} from '../controllers/profileController';
import { sessionHandler } from '../middleware/sessionManagerMiddleware';
import { refreshToken } from '../middleware/refreshTokenMiddleware';

const profileRouter = express.Router();

profileRouter.use(sessionHandler, refreshToken, checkJwt);

profileRouter.get('/status', claimIncludes('permissions', 'read:profile'), getUserStatusController);
profileRouter.get(
  '/me',

  claimIncludes('permissions', 'read:profile'),
  getProfileController
);

profileRouter.patch('/me', claimIncludes('permissions', 'edit:profile'), updateProfileController);

export default profileRouter;
