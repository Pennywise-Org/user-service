import { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import { UpdateUserPlanRequest, UpdateUserPlanResponse } from '../grpc/proto/user/v1/user';
import { updateUserPlanPrisma } from '../services/prismaUserService';
import { getLogger } from '../config/logger';
import { verifyAccessToken } from './tokenService';
import { getManagementAPIToken } from './authService';
import { getManagementAPITokenRedis } from './redisService';
import { deleteUserRole, fetchUserRoleService, updateUserRole } from './managementService';
import { PLAN_MAPPING } from '../config/planMapping';

const logger = getLogger('grpc-service');

/**
 * gRPC handler for updating a user's plan.
 *
 * Steps:
 * 1. Authenticate using a Bearer token in metadata
 * 2. Validate request payload (auth0_id, plan_id, updated_at)
 * 3. Update user's plan in DB
 * 4. Sync role change via Auth0 Management API
 */
export const updateUserPlanService = async (
  call: ServerUnaryCall<UpdateUserPlanRequest, UpdateUserPlanResponse>,
  callback: sendUnaryData<UpdateUserPlanResponse>
) => {
  const metadata = call.metadata;
  const authHeader = metadata.get('authorization')[0] as string;

  // 1. Authenticate the incoming gRPC request
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authorization header missing or malformed in gRPC metadata');
    return callback(null, {
      success: false,
      error_message: 'Unauthenticated',
      code: 401,
    });
  }

  try {
    const accessToken = authHeader.split(' ')[1];
    await verifyAccessToken(accessToken);
    logger.info('gRPC request authenticated successfully');
  } catch (err) {
    logger.warn('Access token verification failed', {
      error: err instanceof Error ? err.message : err,
    });
    return callback(null, {
      success: false,
      error_message: 'Unauthenticated',
      code: 401,
    });
  }

  // 2. Validate payload
  const { auth0_id, plan_id, updated_at } = call.request;

  logger.info('Processing UpdateUserPlan request', {
    auth0_id,
    plan_id,
    updated_at,
  });

  if (!auth0_id) {
    logger.warn('Missing auth0_id in request body');
    return callback(null, {
      success: false,
      error_message: 'Missing user identifier',
      code: 400,
    });
  }

  // 3. Core business logic
  try {
    const newRoleEntry = Object.entries(PLAN_MAPPING).find(([_, plan]) => plan.id === plan_id);
    const newRoleId = newRoleEntry?.[1].roleId!;

    await updateUserPlanPrisma(auth0_id, plan_id, updated_at);
    logger.debug('User plan updated in database', { auth0_id });

    let managementAccessToken: string;
    try {
      managementAccessToken = await getManagementAPITokenRedis();
      logger.debug('Using cached Management API access token');
    } catch {
      logger.debug('Token not found in Redis, fetching from Auth0');
      managementAccessToken = await getManagementAPIToken();
    }

    const currentRole = await fetchUserRoleService(managementAccessToken, auth0_id);
    if (newRoleId === currentRole) {
      logger.warn('Old role is the same as the new role. Skipping role update', {
        auth0_id,
        role: currentRole,
      });

      return callback(null, {
        success: true,
        error_message: '',
        code: 200,
      });
    }
    await deleteUserRole(managementAccessToken, auth0_id, currentRole);
    await updateUserRole(managementAccessToken, auth0_id, newRoleId);

    logger.info('User role updated via Auth0 Management API', {
      auth0_id,
      old_role: currentRole,
      new_role: plan_id,
    });

    return callback(null, {
      success: true,
      error_message: '',
      code: 200,
    });
  } catch (err) {
    logger.error('Unexpected error during UpdateUserPlan', {
      auth0_id,
      plan_id,
      error: err instanceof Error ? err.message : err,
    });

    return callback(null, {
      success: false,
      error_message: 'Internal server error',
      code: 500,
    });
  }
};
