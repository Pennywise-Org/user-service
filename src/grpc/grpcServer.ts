import { userServiceDefinition } from './proto/user/v1/user.grpc-server';
import {
  getUserDetailsService,
  getUserSettingsService,
  updateUserPlanService,
} from '../services/grpcService';
import { getLogger } from '../config/logger';
import { Server, ServerCredentials } from '@grpc/grpc-js';
import fs from 'fs';
import * as path from 'path';

const logger = getLogger('grpc-server');

const certChain = fs.readFileSync(path.resolve('certs', 'server.crt'));
const privateKey = fs.readFileSync(path.resolve('certs', 'server.key'));
const ca = fs.readFileSync(path.resolve('certs', 'ca.crt'));

export const startGrpcServer = () => {
  return new Promise<void>((resolve, reject) => {
    const server = new Server();

    server.addService(userServiceDefinition, {
      updateUserPlan: updateUserPlanService,
      getUserDetailsFromSession: getUserDetailsService,
      getUserSettings: getUserSettingsService,
    });

    const GRPC_PORT = '0.0.0.0:50051';

    server.bindAsync(
      GRPC_PORT,
      ServerCredentials.createSsl(ca, [{ private_key: privateKey, cert_chain: certChain }], true),
      (err, port) => {
        if (err) {
          logger.error('Failed to bind gRPC server', { error: err });
          return reject(err);
        }
        logger.info(`gRPC server started on ${GRPC_PORT}`);
        resolve();
      }
    );
  });
};
