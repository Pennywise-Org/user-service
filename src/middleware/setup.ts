import cors from 'cors';
import helmet from 'helmet';
import express, { Application } from 'express';
import { httpLogger } from '../middleware/httpLogger';
import authRouter from '../routes/authRouter';
import cookieParser from 'cookie-parser';
import profileRouter from '../routes/profileRouter';
import publicRouter from '../routes/publicRoutes';
import { env } from '../config/env';
import settingsRouter from '../routes/settingRouter';

const setupMiddleware = (app: Application) => {
  app.use(cors(env.CORS_OPTIONS));
  app.use(helmet());
  app.use(httpLogger);
  app.use(express.json());
  app.use(cookieParser());
  app.use(publicRouter);
  app.use(`${env.API_PREFIX}/auth`, authRouter);
  app.use(`${env.API_PREFIX}/user/profile`, profileRouter);
  app.use(`${env.API_PREFIX}/user/settings`, settingsRouter);
};

export default setupMiddleware;
