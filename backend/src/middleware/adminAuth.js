import { config } from '../config/env.js';

const normalize = (value) => String(value || '').trim();

export const authenticateAdminCredentials = ({ username, password }) =>
  normalize(username) === normalize(config.ADMIN_USERNAME) &&
  normalize(password) === normalize(config.ADMIN_PASSWORD);

export const requireAdminApi = (req, res, next) => {
  if (req.session?.adminUser) {
    return next();
  }

  return res.status(401).json({ error: 'Admin authentication required.' });
};
