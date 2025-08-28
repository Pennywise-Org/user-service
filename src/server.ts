import dotenv from 'dotenv';
import express, { Application } from 'express';
import setupMiddleware from './middleware/setup';
import { startGrpcServer } from './grpc/grpcServer';

dotenv.config();

const application: Application = express();

setupMiddleware(application);

const PORT = process.env.PORT || 3000;

application.listen(PORT, () => {
  console.log('Server is listening on port 3000...');
});

startGrpcServer()
  .then(() => console.log('gRPC server started successfully'))
  .catch((err) => {
    console.error('Failed to start gRPC server', err);
    process.exit(1);
  });
