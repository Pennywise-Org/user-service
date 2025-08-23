import express, { Request, Response } from 'express';

const publicRouter = express.Router();

publicRouter.get('/health', (req: Request, res: Response) => {
  if (req) {
    res.status(200).json({ status: 'OK', message: 'User Service is up' });
  }
});

publicRouter.get('/logout-success', (req: Request, res: Response) => {
  if (req) {
    res.status(200).send('<h1>Logged Out successfully</h1>');
  }
});

export default publicRouter;
