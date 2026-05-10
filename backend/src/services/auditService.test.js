import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
const find = vi.fn();
const countDocuments = vi.fn();

vi.mock('../models/AuditLog.js', () => ({
  default: {
    create,
    find,
    countDocuments,
  },
}));

describe('recordAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an audit log entry', async () => {
    const { recordAuditLog } = await import('./auditService.js');
    create.mockResolvedValue({ _id: 'log-id' });

    await recordAuditLog({
      actor: 'admin',
      action: 'auction.approve',
      entityType: 'auction',
      entityId: '507f1f77bcf86cd799439011',
      reason: 'Looks good',
      metadata: { status: 'active' },
    });

    expect(create).toHaveBeenCalledWith({
      actor: 'admin',
      action: 'auction.approve',
      entityType: 'auction',
      entityId: '507f1f77bcf86cd799439011',
      reason: 'Looks good',
      metadata: { status: 'active' },
    });
  });

  it('skips incomplete audit entries', async () => {
    const { recordAuditLog } = await import('./auditService.js');

    await expect(recordAuditLog({ action: '', entityType: 'auction' })).resolves.toBeNull();

    expect(create).not.toHaveBeenCalled();
  });
});

describe('listAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists audit logs with pagination metadata', async () => {
    const { listAuditLogs } = await import('./auditService.js');
    const limit = vi.fn(() => Promise.resolve([{ action: 'auction.approve' }]));
    const skip = vi.fn(() => ({ limit }));
    const sort = vi.fn(() => ({ skip }));
    find.mockReturnValue({ sort });
    countDocuments.mockResolvedValue(1);

    const result = await listAuditLogs({ entityType: 'auction', page: 2, limit: 10 });

    expect(find).toHaveBeenCalledWith({ entityType: 'auction' });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(10);
    expect(limit).toHaveBeenCalledWith(10);
    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 1, pages: 1 });
  });
});
