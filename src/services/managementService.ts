import { getLogger } from '../config/logger';
import axios from 'axios';
import { env } from '../config/env';

const logger = getLogger('Auth0-Management-Service');

/**
 * Fetch the current Auth0 role ID assigned to a user
 */
export const fetchUserRoleService = async (
  accessToken: string,
  auth0Id: string
): Promise<string> => {
  const url = `${env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0Id)}/roles`;

  logger.info('Fetching user role from Auth0', { auth0Id });

  try {
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 200) {
      logger.error('Failed to fetch user role from Auth0', { auth0Id, status: response.status });
      throw new Error(`Unexpected status: ${response.status}`);
    }

    const roles = response.data;
    if (!Array.isArray(roles) || roles.length === 0) {
      logger.warn('No role assigned to user in Auth0', { auth0Id });
      throw new Error('No role assigned to user');
    }

    logger.info('Fetched user role from Auth0', { auth0Id, roleId: roles[0].id });
    return roles[0].id;
  } catch (err) {
    logger.error('Error fetching user role from Auth0', {
      auth0Id,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};

/**
 * Remove a role from a user in Auth0
 */
export const deleteUserRole = async (
  accessToken: string,
  auth0Id: string,
  roleId: string
): Promise<void> => {
  const url = `${env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0Id)}/roles`;
  const data = JSON.stringify({ roles: [roleId] });

  logger.info('Deleting user role in Auth0', { auth0Id, roleId });

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      data: data,
    });

    if (response.status !== 204) {
      logger.error('Failed to delete user role in Auth0', {
        auth0Id,
        roleId,
        status: response.status,
      });
      throw new Error(`Unexpected status: ${response.status}`);
    }

    logger.info('Deleted user role from Auth0', { auth0Id, roleId });
  } catch (err) {
    logger.error('Error deleting user role from Auth0', {
      auth0Id,
      roleId,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};

/**
 * Assign a new role to a user in Auth0
 */
export const updateUserRole = async (
  accessToken: string,
  auth0Id: string,
  newRoleId: string
): Promise<void> => {
  const url = `${env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0Id)}/roles`;
  const data = JSON.stringify({ roles: [newRoleId] });

  logger.info('Assigning new role to user in Auth0', { auth0Id, newRoleId });

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 204) {
      logger.error('Failed to assign new role in Auth0', {
        auth0Id,
        newRoleId,
        status: response.status,
      });
      throw new Error(`Unexpected status: ${response.status}`);
    }

    logger.info('Assigned new role to user in Auth0', { auth0Id, newRoleId });
  } catch (err) {
    logger.error('Error assigning new role in Auth0', {
      auth0Id,
      newRoleId,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
};
