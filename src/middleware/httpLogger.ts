import pinoHttp from 'pino-http';
import pino from 'pino';
import { join } from 'path';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../types/pinoHttp';

const httpLogPath = join(env.LOG_DIR, 'http.dev.log');

const httpLoggerInstance = pino(
  {
    level: env.LOG_LEVEL || 'info',
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: () => ({}),
      log: (obj) => obj,
    },
  },
  pino.destination({ dest: httpLogPath, mkdir: true })
);

export const httpLogger = pinoHttp({
  logger: httpLoggerInstance,
  customProps: (req: AuthenticatedRequest) => ({
    requestId: req.id,
    user: req.auth?.payload?.sub,
  }),
});
