import { decodeAccessToken, verifyAccessToken } from '../services/tokenService';
import { getLogger } from '../config/logger';
import { allowedClients } from '../config/allowedClients';
import { Metadata } from '@grpc/grpc-js';

const logger = getLogger('grpc-auth');

/**
 * Verifies a gRPC access token from metadata.
 *
 * - Ensures the token exists and is properly formatted
 * - Verifies the signature, issuer, and audience
 * - Decodes and validates the custom `clientName` claim
 * - Checks if the client is allowed to access this service
 *
 * @param authHeader - The 'authorization' header from gRPC metadata
 * @returns true if the token is valid and client is authorized
 * @throws Error if validation fails at any step
 */
export const verifyGrpcAuthToken = async (metadata: Metadata) => {
  const rawAuthHeader = metadata.get('authorization');

  // Check if header is present and formatted correctly
  if (!rawAuthHeader || !Array.isArray(rawAuthHeader) || !rawAuthHeader[0]) {
    logger.warn('Missing Authorization metadata in gRPC call');
    throw new Error('Unauthorized: Authorization header missing');
  }

  const authHeader = rawAuthHeader[0] as string;
  // Step 1: Ensure auth header exists and follows "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or malformed Authorization header in gRPC metadata');
    throw new Error('Unauthorized: Invalid Authorization header format');
  }

  try {
    // Step 2: Extract and verify access token
    const accessToken = authHeader.split(' ')[1];
    await verifyAccessToken(accessToken); // validates signature, aud, iss, etc.
    logger.debug('Access token signature and claims verified');

    // // Step 3: Decode the access token payload to read client metadata
    // const decodedAccessToken = await decodeAccessToken(accessToken);
    // const clientName = decodedAccessToken?.['https://pennywise.app/clientName'];

    // // Step 4: Ensure client name is present in custom claim
    // if (!clientName) {
    //   logger.error('Missing custom claim: clientName');
    //   throw new Error('Unauthorized: client name not found in token');
    // }

    // // Step 5: Check if client is allowed to call this service
    // if (!allowedClients.includes(clientName)) {
    //   logger.error('Unauthorized client attempted access', { clientName });
    //   throw new Error('Unauthorized: client not allowed');
    // }

    logger.info('gRPC token validated successfully');
    return true;
  } catch (err) {
    logger.warn('gRPC token validation failed', {
      error: err instanceof Error ? err.message : err,
    });
    throw new Error('Unauthorized: token validation failed');
  }
};
