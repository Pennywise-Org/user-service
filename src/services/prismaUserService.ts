import prisma from '../clients/prismaClient';
import { getLogger } from '../config/logger';
import { PLAN_MAPPING } from '../config/planMapping';
import { userProfile } from '../schema/userSchema';
import { encryptToken, decryptToken } from '../utils/aes';
import { maskSSN } from '../utils/maskSsn';
import { userSettingPrisma } from '../types/userSettings';
import { getUserIdByAuth0 } from '../utils/userId';
import { env } from '../config/env';

const logger = getLogger('Prisma-User-Service');

const IV_LENGTH = 16;

/**
 * saveUserAndProfile
 * -------------------
 * Creates or updates a user in PostgreSQL using Prisma:
 *  - If user exists: updates profile picture and updated_at timestamp.
 *  - If user doesn't exist: creates a new user with a default plan and profile.
 */
export const saveUserPrimsa = async (userData: any): Promise<boolean> => {
  const userId = userData.sub;
  logger.info('Upserting user and profile in database', { userId });

  try {
    await prisma.user.create({
      data: {
        auth0Id: userId,
        email: userData.email,
        planId: PLAN_MAPPING.free.id, // Assign default free plan
      },
    });

    logger.info('User and profile saved/updated successfully', { userId });
    return true;
  } catch (err) {
    logger.error('Database error while saving/updating user profile', { err, userId });
    throw err; // propagate error to service layer
  }
};

/**
 * getUserProfile
 * ---------------
 * Fetches user profile by Auth0 user ID:
 *  - Returns profile data if user exists.
 *  - Throws a 404 error if user is not found.
 */
export const getUserProfilePrisma = async (auth0Id: string) => {
  logger.info('Fetching user profile from database', { auth0Id });

  try {
    const user = await prisma.user.findUnique({
      where: { auth0Id: auth0Id },
      select: {
        userProfile: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            dateOfBirth: true,
            street: true,
            city: true,
            state: true,
            country: true,
            postalCode: true,
            annualIncome: true,
            riskTolerance: true,
            ssnMasked: true,
            onboardingComplete: true,
            kycSubmitted: true,
            phoneVerified: true,
            plaidConnected: true,
          },
        },
      },
    });

    if (!user) {
      logger.warn('User not found in database', { auth0Id });
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }

    logger.info('User profile fetched successfully', { userId: auth0Id });
    return user.userProfile;
  } catch (err) {
    logger.error('Database error while fetching user profile', { err, auth0Id });
    throw err;
  }
};

/**
 * Updates the user profile in the database for the user identified by Auth0 ID.
 * - Filters out undefined fields from the input to avoid overwriting existing values with null/undefined.
 * - Ensures the user exists in the DB before attempting the update.
 * - Returns only the selected fields of the updated profile (safe to expose to frontend).
 *
 * @param auth0Id - The Auth0 user ID.
 * @param profileData - The user profile data to update (partial).
 * @returns Updated user profile with selected fields.
 */
export const updateUserProfilePrisma = async (
  auth0Id: string,
  profileData: userProfile
): Promise<any> => {
  logger.info('Updating profile info', { userId: auth0Id });

  // Remove undefined values to only update fields that are actually provided
  const data = Object.fromEntries(Object.entries(profileData).filter(([_, v]) => v !== undefined));
  if ('ssn' in data && data.ssn) {
    const rawSsn = data.ssn as string;
    const encryptedSsn = encryptToken(rawSsn, env.ENCRYPTION_KEY, IV_LENGTH);
    const maskedSsn = maskSSN(rawSsn);

    delete data.ssn;
    data.ssnEncrypted = encryptedSsn;
    data.ssnMasked = maskedSsn;
  }
  try {
    // Check if user exists and fetch their internal user ID
    const userID = await getUserIdByAuth0(auth0Id);
    // Update user profile and return only safe fields
    const updatedUser = await prisma.userProfile.upsert({
      where: { id: userID },
      create: {
        userId: userID,
        ...data,
      },
      update: data,
    });
    const { id, createdAt, updatedAt, userId, ...profile } = updatedUser;
    logger.info('User profile saved/updated successfully', { auth0Id });
    return profile;
  } catch (err: any) {
    logger.error('Database error while saving/updating user profile', { err, auth0Id });
    throw err;
  }
};

/**
 * Save a newly rotated refresh token in the database.
 * - Revokes the old refresh token (if provided).
 * - Encrypts the new refresh token before storage.
 * - Associates the token with the given sessionId for session-level tracking.
 *
 * @param sessionId - The session ID associated with this token.
 * @param newRefreshToken - The newly issued refresh token (plaintext).
 * @param auth0Id - The user's Auth0 ID to locate the user in the DB.
 * @param oldRefreshToken - (Optional) The previous refresh token to revoke.
 */
export const saveRefreshTokenPrisma = async (
  sessionId: string,
  newRefreshToken: string,
  auth0Id: string,
  oldRefreshToken?: string | null
): Promise<void> => {
  logger.info('Saving rotated refresh token', { sessionId });

  // Calculate expiry date for the new refresh token based on configured lifetime
  const expiryDate = new Date(Date.now() + env.AUTH0_REFRESH_TOKEN_EXPIRY * 1000);

  try {
    // Fetch the user's internal ID using their Auth0 ID
    const userID = await getUserIdByAuth0(auth0Id);

    // If an old refresh token is provided, mark it as revoked
    if (oldRefreshToken) {
      await prisma.userRefreshToken.updateMany({
        where: { sessionId: sessionId, userId: userID, revoked: false },
        data: { revoked: true },
      });
      logger.info('Old refresh token revoked');
    }

    // Encrypt the new refresh token before storing it
    const encryptedToken = encryptToken(newRefreshToken, env.ENCRYPTION_KEY, IV_LENGTH);

    // Insert a new row for the rotated token
    await prisma.userRefreshToken.create({
      data: {
        userId: userID,
        refreshToken: encryptedToken,
        sessionId: sessionId,
        expiresAt: expiryDate,
      },
    });

    logger.info('New refresh token stored successfully');
  } catch (err) {
    // Catch and log any DB or encryption errors
    logger.error('Failed to save rotated refresh token', { err });
    throw err;
  }
};

/**
 * fetchRefreshToken
 * ------------------
 * Retrieves the most recent valid (non-revoked, unexpired) refresh token associated with a given session.
 * - Ensures the token has not been revoked and hasn't expired.
 * - Decrypts the encrypted token from the database before returning.
 * - Throws an error if no valid refresh token is found.
 *
 * @param sessionId - The unique session ID tied to the refresh token.
 * @returns The decrypted refresh token as a string.
 */
export const fetchRefreshTokenPrisma = async (sessionId: string, auth0Id: string) => {
  logger.info('Fetching refresh token from database', { sessionId });

  try {
    const userID = await getUserIdByAuth0(auth0Id);

    const refreshTokenData = await prisma.userRefreshToken.findFirst({
      where: {
        sessionId: sessionId,
        userId: userID,
        revoked: false,
        expiresAt: { gt: new Date() }, // only consider unexpired tokens
      },
      select: {
        refreshToken: true,
      },
    });

    // If no valid token is found, throw a 404-like error
    if (!refreshTokenData) {
      const err = new Error('No valid refresh token found');
      (err as any).statusCode = 404;
      throw err;
    }

    logger.info('Valid refresh token fetched from database', { sessionId });

    // Decrypt the encrypted refresh token before returning
    const refreshToken = decryptToken(refreshTokenData.refreshToken, env.ENCRYPTION_KEY);
    return refreshToken;
  } catch (err) {
    logger.error('Failed to fetch refresh token', { sessionId, error: err });
    throw err;
  }
};

/**
 * revokeRefreshToken
 * --------------------
 * Marks all currently valid (i.e., not already revoked) refresh tokens for the given session as revoked.
 * - Used during logout or token rotation to ensure prior tokens can't be reused.
 * - Does **not** delete the token; keeps an audit trail of token lifecycle.
 *
 * @param sessionId - The session ID whose tokens are to be revoked.
 */
export const revokeRefreshTokenPrisma = async (sessionId: string, auth0Id: string) => {
  logger.info('Revoking refresh tokens in database', { sessionId });

  try {
    const userID = await getUserIdByAuth0(auth0Id);

    await prisma.userRefreshToken.updateMany({
      where: {
        sessionId: sessionId,
        revoked: false, // only revoke those still active
        userId: userID,
      },
      data: {
        revoked: true,
      },
    });

    logger.info('Refresh tokens successfully revoked', { sessionId });
  } catch (err) {
    logger.error('Error during refresh token revocation', { sessionId, error: err });
    throw err;
  }
};

/**
 * Updates a user's plan in the database based on their Auth0 ID.
 *
 * @param auth0Id - The Auth0 identifier for the user
 * @param planId - The new plan ID to assign to the user
 * @param updatedAt - The timestamp when the plan was updated (as ISO 8601 string)
 */
export const updateUserPlanPrisma = async (auth0Id: string, planId: string, updatedAt: string) => {
  logger.info('Starting user plan update', {
    auth0Id,
    planId,
    updatedAt,
  });

  try {
    const result = await prisma.user.update({
      where: {
        auth0Id: auth0Id,
      },
      data: {
        planId: planId,
        updatedAt: updatedAt,
      },
    });

    logger.info('User plan updated successfully', {
      userId: result.id,
      newPlanId: result.planId,
    });
  } catch (err) {
    logger.error('Failed to update user plan', {
      auth0Id,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};

/**
 * markStepCompletePrisma
 * -----------------------
 * Marks a specific boolean onboarding step (e.g., phoneVerified, plaidConnected) as complete
 * for the user identified by their Auth0 ID.
 *
 * @param auth0Id - The Auth0 user ID
 * @param field - The userProfile field to mark as complete (must be a boolean flag field)
 */
export const markStepCompletePrisma = async (auth0Id: string, field: keyof userProfile) => {
  logger.info('Marking onboarding step as complete', { auth0Id, field });

  try {
    // 1. Fetch internal user ID from Auth0 ID
    const userID = await getUserIdByAuth0(auth0Id);

    // 2. Update the userProfile field to true (step marked complete)
    await prisma.userProfile.update({
      where: { userId: userID },
      data: { [field]: true },
    });

    logger.info('Onboarding step marked complete successfully', { userId: userID, field });
  } catch (err) {
    logger.error('Failed to mark onboarding step as complete', {
      auth0Id,
      field,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};

/**
 * Fetches user settings from the database for the given Auth0 user ID.
 *
 * @param auth0Id - The Auth0 ID of the user
 * @returns An array of key-value settings for the user
 * @throws Error if user not found or database access fails
 */

export const getUserSettingsPrisma = async (auth0Id: string) => {
  logger.info('Starting to fetch user settings', { auth0Id });

  try {
    // 1. Resolve internal user ID from Auth0 ID
    const userId = await getUserIdByAuth0(auth0Id);
    logger.info('Resolved internal user ID for settings fetch', { userId });

    // 2. Query the user's saved settings from the DB
    const userSettings = await prisma.userSetting.findMany({
      where: { userId },
      select: {
        key: true,
        value: true,
      },
    });

    logger.info('User settings fetched successfully', { userId, count: userSettings.length });
    return userSettings;
  } catch (err) {
    logger.error('Failed to fetch user settings from database', {
      auth0Id,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};

/**
 * updateUserSettingsPrisma
 * ------------------------
 * Upserts user settings in the database for a given user:
 *  - If the setting exists for the user, it is updated.
 *  - If not, it is created.
 *
 * @param auth0Id - Auth0 user ID
 * @param settings - Key-value map of user settings to update
 */
export const updateUserSettingsPrisma = async (auth0Id: string, settings: userSettingPrisma) => {
  logger.info('Updating user settings in database', {
    auth0Id,
    settingsCount: Object.keys(settings).length,
  });

  try {
    const userID = await getUserIdByAuth0(auth0Id);
    // 2. Create upsert operations for each setting
    const operations = Object.entries(settings).map(([key, value]) =>
      prisma.userSetting.upsert({
        where: { userId_key: { userId: userID, key } },
        update: { value },
        create: { userId: userID, key, value },
      })
    );

    // 3. Run all operations in parallel
    await Promise.all(operations);

    logger.info('User settings updated successfully', { userId: userID });
  } catch (err) {
    logger.error('Failed to update user settings', {
      err: err instanceof Error ? err.message : err,
      auth0Id,
    });
    throw err;
  }
};
