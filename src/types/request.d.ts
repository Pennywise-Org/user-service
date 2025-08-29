import { Request } from 'express';

export interface SessionRequest extends Request {
  sessionId?: string;
  session?: {
    userId: string;
    accessToken: string;
    accessExp: number;
  };
}
