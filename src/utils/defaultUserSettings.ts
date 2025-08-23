import { ALLOWED_USER_SETTINGS } from '../config/userSettings';
import { getLogger } from '../config/logger';

const logger = getLogger('Default-User-Settings');

/**
 * getDefaultUserSettings
 * -----------------------
 * Filters and returns default settings that are allowed for free-tier users.
 * This is used to initialize settings for a new user.
 *
 * @returns Array of key-value pairs representing default free user settings.
 */
export const getDefaultUserSettings = async () => {
  logger.info('Fetching default settings for free users');

  const defaultFeatures = Object.entries(ALLOWED_USER_SETTINGS)
    .filter(([key, setting]) => {
      const include = !setting.premiumOnly;
      if (!include) {
        logger.debug('Skipping premium-only setting', { key });
      }
      return include;
    })
    .map(([key, setting]) => ({
      key,
      value: setting.default,
    }));

  logger.info('Default settings fetched successfully', { count: defaultFeatures.length });
  return defaultFeatures;
};
