import express from 'express';
import { claimIncludes } from 'express-oauth2-jwt-bearer';
import { checkJwt } from '../middleware/auth';
import { getUserStatusController, getProfileController, updateProfileController } from '../controllers/profileController';
import { sessionHandler } from '../middleware/sessionManager';
import { refreshToken } from '../middleware/refreshToken';

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
