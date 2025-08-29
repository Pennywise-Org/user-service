// src/middleware/setupMiddleware.ts

import cors from 'cors';
import helmet from 'helmet';
import express, { Application } from 'express';
import { httpLogger } from './httpLoggerMiddleware';
import authRouter from '../routes/authRouter';
import cookieParser from 'cookie-parser';
import profileRouter from '../routes/profileRouter';
import publicRouter from '../routes/publicRoutes';
import { env } from '../config/env';
import settingsRouter from '../routes/settingRouter';

/**
 * Applies global middleware and mounts route handlers on the Express app.
 *
 * @param app Express Application instance
 */
const setupMiddleware = (app: Application) => {
  // Enable CORS using configured origin and options
  app.use(cors(env.CORS_OPTIONS));

  // Set secure HTTP headers (prevents some common web vulnerabilities)
  app.use(helmet());

  // Attach request logger (writes HTTP logs to file)
  app.use(httpLogger);

  // Parse incoming JSON request bodies
  app.use(express.json());

  // Parse cookies from incoming requests
  app.use(cookieParser());

  // Public routes (e.g., health check, landing pages)
  app.use(publicRouter);

  // Auth routes (login, register, token exchange)
  app.use(`${env.API_PREFIX}/auth`, authRouter);

  // Authenticated user profile routes
  app.use(`${env.API_PREFIX}/user/profile`, profileRouter);

  // Authenticated user settings routes
  app.use(`${env.API_PREFIX}/user/settings`, settingsRouter);
};

export default setupMiddleware;