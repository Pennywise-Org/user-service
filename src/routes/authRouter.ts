import express from 'express';
import {
  authorizeController,
  callbackController,
  logoutController,
} from '../controllers/authController';

const authRouter = express.Router();

authRouter.get('/authorize', authorizeController);

authRouter.get('/callback', callbackController);

authRouter.get('/logout', logoutController);


export default authRouter;
