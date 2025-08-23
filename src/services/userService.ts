import { getDefaultUserSettings } from '../utils/defaultUserSettings';
import { updateUserSettingsPrisma } from './prismaUserService';
import { getLogger } from '../config/logger';

const logger = getLogger('User-Settings-Service');

/**
 * setDefaultUserSettings
 * ----------------------
 * Assigns the default settings to a newly created user.
 * - Only includes settings allowed for free users.
 * - Pulls defaults from config and persists them in the database.
 *
 * @param auth0Id - The Auth0 user ID of the newly registered user.
 */
export const setDefaultUserSettings = async (auth0Id: string) => {
  const defaultSettings = await getDefaultUserSettings();
  logger.info('Setting default user settings', { auth0Id, count: defaultSettings.length });

  try {
    await updateUserSettingsPrisma(auth0Id, defaultSettings);
    logger.info('Default user settings saved successfully', { auth0Id });
  } catch (err) {
    logger.error('Failed to set default user settings', {
      auth0Id,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};
