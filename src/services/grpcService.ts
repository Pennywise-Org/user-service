import { ServerUnaryCall, sendUnaryData, status } from '@grpc/grpc-js';
import {
  GetUserDetailsFromSessionRequest,
  GetUserDetailsFromSessionResponse,
  GetUserSettingsRequest,
  GetUserSettingsResponse,
  UpdateUserPlanRequest,
  UpdateUserPlanResponse,
} from '../grpc/proto/user/v1/user';
import { getUserSettingsPrisma, updateUserPlanPrisma } from '../services/prismaUserService';
import { getLogger } from '../config/logger';
import { getManagementAPIToken } from './authService';
import { getManagementAPITokenRedis, getUserSessionRedis } from './redisService';
import { deleteUserRole, fetchUserRoleService, updateUserRole } from './managementService';
import { PLAN_MAPPING } from '../config/planMapping';
import { verifyGrpcAuthToken } from '../grpc/grpcAuth';
import { decodeAccessToken } from './tokenService';

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
  logger.info('Received UpdateUserPlan request. Verifying authentication token...');
  try {
    await verifyGrpcAuthToken(call.metadata);
  } catch (err) {
    logger.warn('gRPC auth failed — rejecting request');
    return callback(
      {
        code: status.UNAUTHENTICATED,
        message: 'Missing or invalid token',
      },
      null
    );
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
        code: 200,
      });
    }
    await deleteUserRole(managementAccessToken, auth0_id, currentRole);
    await updateUserRole(managementAccessToken, auth0_id, newRoleId);

    logger.info('User role updated via Auth0 Management API', {
      auth0_id,
      old_role: currentRole,
      new_role: newRoleId,
    });

    return callback(null, {
      success: true,
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
      error_message: err instanceof Error ? err.message : String(err),
      code: 500,
    });
  }
};

/**
 * gRPC handler for retrieving user details from a session ID.
 *
 * Flow:
 * 1. Verify the incoming gRPC metadata (machine token auth)
 * 2. Look up session data in Redis using session ID
 * 3. Decode the stored user access token to extract role and permissions
 * 4. Return user identity details to the calling service
 */
export const getUserDetailsService = async (
  call: ServerUnaryCall<GetUserDetailsFromSessionRequest, GetUserDetailsFromSessionResponse>,
  callback: sendUnaryData<GetUserDetailsFromSessionResponse>
) => {
  // Step 1: Auth check (gRPC metadata)
  logger.info('Received getUserDetail request. Verifying authentication token...');
  try {
    await verifyGrpcAuthToken(call.metadata);
  } catch (err) {
    logger.warn('gRPC auth failed — rejecting request', {
      reason: err instanceof Error ? err.message : err,
    });

    return callback(
      {
        code: status.UNAUTHENTICATED,
        message: 'Missing or invalid token',
      },
      null
    );
  }

  const { session_id } = call.request;

  // Step 2: Try to fetch and decode user session info
  try {
    const { sessionData } = await getUserSessionRedis(session_id);
    const { accessToken, userId } = sessionData;

    const decodedAccessToken = await decodeAccessToken(accessToken);
    const role = decodedAccessToken?.['https://pennywise.app/role'];
    const permissions = decodedAccessToken?.permissions || [];

    logger.info('Fetched user details from session ID', {
      session_id,
      userId,
      role,
    });

    return callback(null, {
      success: true,
      auth0_id: userId,
      role,
      permissions,
      code: 200,
    });
  } catch (err) {
    logger.error('Failed to fetch user details from session ID', {
      session_id,
      error: err instanceof Error ? err.message : err,
    });

    return callback(null, {
      success: false,
      permissions: [],
      error_message: err instanceof Error ? err.message : String(err),
      code: 500,
    });
  }
};

/**
 * gRPC handler for retrieving user settings based on Auth0 ID.
 *
 * Flow:
 * 1. Authenticate the incoming gRPC metadata (machine token)
 * 2. Fetch user settings from Postgres via Prisma
 * 3. Convert JSON values to string for proto compatibility
 * 4. Return the settings as a key-value map to the calling service
 */

export const getUserSettingsService = async (
  call: ServerUnaryCall<GetUserSettingsRequest, GetUserSettingsResponse>,
  callback: sendUnaryData<GetUserSettingsResponse>
) => {
  // Step 1: Authenticate the request using metadata
  logger.info('Received getUserSettings request. Verifying authentication token...');
  try {
    await verifyGrpcAuthToken(call.metadata);
  } catch (err) {
    logger.warn('gRPC authentication failed — rejecting request', {
      reason: err instanceof Error ? err.message : err,
    });

    return callback(
      {
        code: status.UNAUTHENTICATED,
        message: 'Missing or invalid token',
      },
      null
    );
  }

  const { auth0_id } = call.request;
  logger.info('Received GetUserSettings request', { auth0_id });

  // Step 2: Fetch settings from database using Auth0 ID
  try {
    const userSettings = await getUserSettingsPrisma(auth0_id);
    logger.info('Fetched user settings from DB', {
      auth0_id,
      count: userSettings.length,
    });

    // Step 3: Format settings into a Record<string, string> for proto response
    const formattedSettings: Record<string, string> = {};
    for (const { key, value } of userSettings) {
      formattedSettings[key] = JSON.stringify(value);
    }

    // Step 4: Return success response with settings map
    return callback(null, {
      success: true,
      settings: formattedSettings,
      code: 200,
    });
  } catch (err) {
    logger.error('Error fetching user settings from DB', {
      auth0_id,
      error: err instanceof Error ? err.message : err,
    });

    return callback(null, {
      success: false,
      settings: {},
      error_message: err instanceof Error ? err.message : String(err),
      code: 500,
    });
  }
};
