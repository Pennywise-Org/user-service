import { ALLOWED_USER_SETTINGS } from '../config/userSettings';
import { getLogger } from '../config/logger';
import { userSettingPrisma } from '../types/userSettings';

const logger = getLogger('Validate-User-Setting-Util');

export const validateSettingsUtil = async (userRole: string, settings: userSettingPrisma) => {
  try {
    Object.entries(settings).forEach(([key, _]) => {
      const rule = ALLOWED_USER_SETTINGS[key as keyof typeof ALLOWED_USER_SETTINGS];

      if (!rule) {
        logger.warn(`Unknown setting key received: ${key}`);
        throw new Error(`Unknown setting: ${key}`);
      }

      if (rule.premiumOnly && userRole !== 'paid-user') {
        logger.warn(
          `User with role ${userRole} tried to update premium setting "${key}". Not allowed.`
        );
        throw new Error(`Unauthorized setting: ${key}`);
      }
    });

    return true;
  } catch (err) {
    logger.error('Error in validateSettingsUtil', { err });
    throw err;
  }
};
