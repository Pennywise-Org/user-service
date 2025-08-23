import prisma from '../clients/prismaClient';
import { getLogger } from '../config/logger';

const logger = getLogger('Get-User-Helper');

/**
 * Resolve internal user ID from Auth0 ID.
 * Throws 404 if user not found.
 */
export const getUserIdByAuth0 = async (auth0Id: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { auth0Id },
    select: { id: true },
  });

  if (!user) {
    logger.warn('User not found', { auth0Id });
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }

  return user.id;
};
