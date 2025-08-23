import { Request, Response } from 'express';
import { getUserSettingsPrisma, updateUserSettingsPrisma } from '../services/prismaUserService';
import { getLogger } from '../config/logger';
import { UserSettingsSchema } from '../schema/userSettingSchema';
import { validateSettingsUtil } from '../utils/validateUserSettings';

const logger = getLogger('Setting-Controller');

export const getUserSettingsController = async (req: Request, res: Response) => {
  try {
    // 1. Extract Auth0 user ID from the token payload
    const auth0UserId = req.auth?.payload?.sub;
    if (!auth0UserId) {
      // Throwing a custom error with statusCode allows cleaner handling in catch
      throw Object.assign(new Error('Unauthorized: Missing sub in token'), { statusCode: 401 });
    }

    // 2. Fetch the user profile from the database via service layer
    const settings = await getUserSettingsPrisma(auth0UserId);

    if (!settings) {
      throw Object.assign(new Error('User settings not found'), { statusCode: 404 });
    }

    return res.json({ success: true, data: settings });
  } catch (err: any) {
    // 4. Log and handle errors
    logger.error('Failed to fetch user settings', { err });
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * Controller: Update user settings
 * ---------------------------------
 * - Authenticates user via token payload.
 * - Validates incoming settings using Zod schema.
 * - Updates each setting via Prisma upsert.
 * - Returns a success or error response.
 */
export const updateUserSettingsController = async (req: Request, res: Response) => {
  try {
    // 1. Extract Auth0 user ID from token
    const auth0UserId = req.auth?.payload?.sub;
    const userRole = req.auth?.payload?.['https://pennywise.app/role'] as string;

    if (!auth0UserId) {
      logger.warn('Unauthorized access attempt – missing sub in token payload');
      throw Object.assign(new Error('Unauthorized: Missing sub in token'), { statusCode: 401 });
    }
    await validateSettingsUtil(userRole, req.body);

    // 2. Validate request body using Zod schema
    const result = UserSettingsSchema.safeParse(req.body);
    if (!result.success) {
      logger.warn('User settings validation failed', {
        auth0UserId,
        issues: result.error.issues,
      });
      throw Object.assign(new Error('Invalid user settings payload'), { statusCode: 400 });
    }

    // 3. Convert validated settings into an array of key-value pairs
    const validatedSettings = result.data;
    const settingsArray = Object.entries(validatedSettings).map(([key, value]) => ({
      key,
      value: value as string | number | boolean | null,
    }));
    logger.info('Updating user settings in database', {
      auth0UserId,
      totalSettings: settingsArray.length,
    });

    // 4. Persist settings via Prisma service

    await updateUserSettingsPrisma(auth0UserId, settingsArray);

    logger.info('User settings updated successfully', { auth0UserId });
    return res.status(200).json({
      success: true,
      message: 'User settings updated successfully',
    });
  } catch (err: any) {
    logger.error('Failed to update user settings', {
      message: err.message,
      statusCode: err.statusCode || 500,
      stack: err.stack,
    });

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error while updating settings',
    });
  }
};
