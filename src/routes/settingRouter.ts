import express from 'express';
import { claimIncludes } from 'express-oauth2-jwt-bearer';
import { checkJwt } from '../middleware/authMiddleware';
import {
  getUserSettingsController,
  updateUserSettingsController,
} from '../controllers/settingController';
import { sessionHandler } from '../middleware/sessionManagerMiddleware';
import { refreshToken } from '../middleware/refreshTokenMiddleware';

const settingsRouter = express.Router();

settingsRouter.use(sessionHandler, refreshToken, checkJwt);

settingsRouter.get(
  '/me',

  claimIncludes('permissions', 'read:profile'),
  getUserSettingsController
);

settingsRouter.patch(
  '/me',
  claimIncludes('permissions', 'edit:profile'),
  updateUserSettingsController
);

export default settingsRouter;
