// middleware/httpLogger.ts

import pinoHttp from 'pino-http';
import pino from 'pino';
import { join } from 'path';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../types/pinoHttp';

// Define the path where HTTP logs will be written
const httpLogPath = join(env.LOG_DIR, 'http.dev.log');

// Create a Pino logger instance for HTTP logs
const httpLoggerInstance = pino(
  {
    level: env.LOG_LEVEL || 'info',
    base: undefined, // Removes default pid/hostname metadata
    timestamp: pino.stdTimeFunctions.isoTime, // ISO timestamp format
    formatters: {
      level: (label) => ({ level: label }), // Customize level formatting
      bindings: () => ({}), // Strip out process/machine bindings
      log: (obj) => obj, // Pass log object as-is
    },
  },
  pino.destination({ dest: httpLogPath, mkdir: true }) // Ensure log file is created
);

// Export Express-compatible HTTP logger middleware
export const httpLogger = pinoHttp({
  logger: httpLoggerInstance,

  // Add request-scoped properties to every log
  customProps: (req: AuthenticatedRequest) => {
    const user = req.auth?.payload?.sub;
    const requestId = req.id;

    // Optional runtime debug log (only logs once per request at start)
    if (env.NODE_ENV !== 'production') {
      httpLoggerInstance.debug({
        msg: 'Incoming request',
        method: req.method,
        url: req.url,
        user,
        requestId,
      });
    }

    return {
      requestId,
      user,
    };
  },
});
