// Minimal env loader; swap to zod if you want strict validation.
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const LOG_LEVEL = process.env.LOG_LEVEL ?? (NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_TO_FILE = (process.env.LOG_TO_FILE ?? 'false').toLowerCase() === 'true';

// Where to write pretty logs if LOG_TO_FILE=true (dev convenience)
const LOG_DIR = process.env.LOG_DIR ?? '/app/logs';
const CORS_OPTIONS = { origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000' };
const API_PREFIX = '/pennywise/api/v1';

const AUDIENCE = process.env.AUDIENCE!;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID!;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET!;
const AUTH0_REDIRECT_URI =
  process.env.AUTH0_REDIRECT_URI || 'http://localhost:3000/pennywise/api/v1/auth/callback';
const AUTH0_SCOPE = process.env.AUTH0_SCOPE!;
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;
const AUTH0_LOGOUT_URL = process.env.AUTH0_LOGOUT_URL!;
const MANAGEMENT_API_AUDIENCE = process.env.MANAGEMENT_API_AUDIENCE!;
const MANAGEMENT_API_CLIENT_ID = process.env.MANAGEMENT_API_CLIENT_ID!;
const MANAGEMENT_API_CLIENT_SECRET = process.env.MANAGEMENT_API_CLIENT_SECRET!;

const AUTH0_REFRESH_TOKEN_EXPIRY = parseInt(process.env.AUTH0_REFRESH_TOKEN_EXPIRY!) || 31557600;
const ENCRYPTION_KEY = Buffer.from(process.env.REFRESH_TOKEN_ENCRYPTION_KEY!, 'base64'); // 32 bytes

const TTL = Number(process.env.SESSION_TTL) || 86400;
const INACTIVITY_TIMEOUT = Number(process.env.INACTIVTY_TIMEOUT_MS) || 900;
const MANAGEMENT_API_KEY = process.env.MANAGEMENT_API_KEY!;

const STATE_SECRET = process.env.STATE_SECRET!;

export const env = {
  NODE_ENV,
  LOG_LEVEL,
  LOG_TO_FILE,
  LOG_DIR,
  CORS_OPTIONS,
  API_PREFIX,
  AUDIENCE,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  AUTH0_DOMAIN,
  AUTH0_LOGOUT_URL,
  AUTH0_REDIRECT_URI,
  AUTH0_SCOPE,
  MANAGEMENT_API_AUDIENCE,
  MANAGEMENT_API_CLIENT_ID,
  MANAGEMENT_API_CLIENT_SECRET,
  AUTH0_REFRESH_TOKEN_EXPIRY,
  ENCRYPTION_KEY,
  TTL,
  INACTIVITY_TIMEOUT,
  MANAGEMENT_API_KEY,
  STATE_SECRET
} as const;
