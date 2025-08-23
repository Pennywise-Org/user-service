// src/types/auth.d.ts
import { IncomingMessage } from 'http';

export interface AuthPayload {
  sub?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends IncomingMessage {
  auth?: {
    payload?: AuthPayload;
    [key: string]: any;
  };
}