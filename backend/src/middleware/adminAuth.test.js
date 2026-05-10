import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadModule = async () => {
  process.env.BOT_TOKEN = 'test-bot-token';
  process.env.CHANNEL_ID = '@test_channel';
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'secret';
  vi.resetModules();
  return import('./adminAuth.js');
};

describe('authenticateAdminCredentials', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts matching admin credentials', async () => {
    const { authenticateAdminCredentials } = await loadModule();

    expect(authenticateAdminCredentials({ username: 'admin', password: 'secret' })).toBe(true);
  });

  it('rejects invalid admin credentials', async () => {
    const { authenticateAdminCredentials } = await loadModule();

    expect(authenticateAdminCredentials({ username: 'admin', password: 'wrong' })).toBe(false);
    expect(authenticateAdminCredentials({ username: 'other', password: 'secret' })).toBe(false);
  });
});

describe('requireAdminApi', () => {
  it('continues when an admin session exists', async () => {
    const { requireAdminApi } = await loadModule();
    const next = vi.fn();

    requireAdminApi({ session: { adminUser: { username: 'admin' } } }, {}, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('returns a 401 when no admin session exists', async () => {
    const { requireAdminApi } = await loadModule();
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    requireAdminApi({ session: {} }, { status }, vi.fn());

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Admin authentication required.' });
  });
});
