import { Request, Response } from 'express';
import { getUserProfilePrisma, updateUserProfilePrisma } from '../services/prismaUserService';
import { getLogger } from '../config/logger';
import { userProfileSchema } from '../schema/userSchema';

const logger = getLogger('Profile-Controller');

export const getUserStatusController = async (req: Request, res: Response) => {
  try {
    // 1. Extract Auth0 user ID from the token payload
    const auth0UserId = req.auth?.payload?.sub;
    if (!auth0UserId) {
      // Throwing a custom error with statusCode allows cleaner handling in catch
      throw Object.assign(new Error('Unauthorized: Missing sub in token'), { statusCode: 401 });
    }

    // 2. Fetch the user profile from the database via service layer
    const profile = await getUserProfilePrisma(auth0UserId);

    if (!profile) {
      throw Object.assign(new Error('User profile not found'), { statusCode: 404 });
    }

    const { onboardingComplete, plaidConnected, phoneVerified, kycSubmitted } = profile;

    const status = { onboardingComplete, phoneVerified, plaidConnected, kycSubmitted };
    return res.json({ success: true, data: status });
  } catch (err: any) {
    // 4. Log and handle errors
    logger.error('Failed to fetch onboarding status', { err });
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};
/**
 * Controller: getProfileController
 * --------------------------------
 * Handles GET requests to retrieve the authenticated user's profile.
 *
 * Flow:
 *  1. Extract the Auth0 user ID (`sub`) from the verified JWT in req.auth.
 *  2. If missing, throw an unauthorized error (401).
 *  3. Call the prisma service to fetch the user's profile from the database.
 *  4. Return the profile as a JSON response.
 *  5. Catch and log any errors, sending an appropriate status and message.
 */
export const getProfileController = async (req: Request, res: Response) => {
  try {
    // 1. Extract Auth0 user ID from the token payload
    const auth0UserId = req.auth?.payload?.sub;
    if (!auth0UserId) {
      // Throwing a custom error with statusCode allows cleaner handling in catch
      throw Object.assign(new Error('Unauthorized: Missing sub in token'), { statusCode: 401 });
    }

    // 2. Fetch the user profile from the database via service layer
    const profile = await getUserProfilePrisma(auth0UserId);

    // 3. Respond with the profile data on success
    return res.status(200).json({ success: true, data: profile });
  } catch (err: any) {
    // 4. Log and handle errors
    logger.error('Error in getProfileController', { err });
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

export const updateProfileController = async (req: Request, res: Response) => {
  try {
    const auth0UserId = req.auth?.payload?.sub;
    if (!auth0UserId) {
      // Throwing a custom error with statusCode allows cleaner handling in catch
      throw Object.assign(new Error('Unauthorized: Missing sub in token'), { statusCode: 401 });
    }

    const result = userProfileSchema.safeParse(req.body);
    if (!result.success) {
      logger.error('Validation failed for user profile', { issues: result.error.issues });
      throw Object.assign(new Error('Malformed data'), { statusCode: 400 });
    }

    const updateProfileData = result.data;
    const updatedUser = await updateUserProfilePrisma(auth0UserId, updateProfileData);
    return res.status(200).json({ success: true, message: 'Profile updated successfully', data: updatedUser });
  } catch (err: any) {
    logger.error('Error in updateProfileController', { err });
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};
