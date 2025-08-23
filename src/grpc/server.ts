import { userServiceDefinition } from './proto/user/v1/user.grpc-server';
import { updateUserPlanService } from '../services/grpcService';
import { getLogger } from '../config/logger';
import { Server, ServerCredentials } from '@grpc/grpc-js';

const logger = getLogger('grpc-server');

export const startGrpcServer = () => {
  return new Promise<void>((resolve, reject) => {
    const server = new Server();

    server.addService(userServiceDefinition, {
      updateUserPlan: updateUserPlanService,
    });

    const GRPC_PORT = '0.0.0.0:50051';

    server.bindAsync(GRPC_PORT, ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        logger.error('Failed to bind gRPC server', { error: err });
        return reject(err);
      }
      logger.info(`gRPC server started on ${GRPC_PORT}`);
      resolve();
    });
  });
};
