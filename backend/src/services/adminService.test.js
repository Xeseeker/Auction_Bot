import { beforeEach, describe, expect, it, vi } from 'vitest';

const userFind = vi.fn();
const userCountDocuments = vi.fn();
const userFindById = vi.fn();
const recordAuditLog = vi.fn();
const emitPlatformUpdate = vi.fn();
const sendBotMessage = vi.fn();

vi.mock('../models/User.js', () => ({
  default: {
    find: userFind,
    countDocuments: userCountDocuments,
    findById: userFindById,
  },
}));

vi.mock('../models/Auction.js', () => ({
  default: {},
}));

vi.mock('../models/Bid.js', () => ({
  default: {},
}));

vi.mock('./auditService.js', () => ({
  recordAuditLog,
}));

vi.mock('./liveUpdateService.js', () => ({
  emitPlatformUpdate,
}));

vi.mock('./notificationService.js', () => ({
  sendBotMessage,
}));

const mockUserFind = (items = []) => {
  const limit = vi.fn(() => Promise.resolve(items));
  const skip = vi.fn(() => ({ limit }));
  const sort = vi.fn(() => ({ skip }));
  userFind.mockReturnValue({ sort });

  return { limit, skip, sort };
};

describe('listUsersForAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies user filters and pagination', async () => {
    const { listUsersForAdmin } = await import('./adminService.js');
    const queryChain = mockUserFind([{ username: 'seller-one' }]);
    userCountDocuments.mockResolvedValue(21);

    const result = await listUsersForAdmin({
      search: 'seller',
      role: 'user',
      banned: 'false',
      sellerApproval: 'pending',
      page: 2,
      limit: 10,
    });

    expect(userFind).toHaveBeenCalledWith({
      role: 'user',
      banned: false,
      sellerApprovalStatus: 'pending',
      $or: [
        { username: { $regex: 'seller', $options: 'i' } },
        { firstName: { $regex: 'seller', $options: 'i' } },
        { lastName: { $regex: 'seller', $options: 'i' } },
        { telegramId: { $regex: 'seller', $options: 'i' } },
      ],
    });
    expect(userCountDocuments).toHaveBeenCalledWith(userFind.mock.calls[0][0]);
    expect(queryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(queryChain.skip).toHaveBeenCalledWith(10);
    expect(queryChain.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      items: [{ username: 'seller-one' }],
      pagination: { page: 2, limit: 10, total: 21, pages: 3 },
    });
  });

  it('lists pending seller approvals through the user listing path', async () => {
    const { listPendingSellerApprovals } = await import('./adminService.js');
    mockUserFind();
    userCountDocuments.mockResolvedValue(0);

    await listPendingSellerApprovals({ page: 1, limit: 20 });

    expect(userFind).toHaveBeenCalledWith({ sellerApprovalStatus: 'pending' });
    expect(userCountDocuments).toHaveBeenCalledWith({ sellerApprovalStatus: 'pending' });
  });
});

describe('admin moderation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bans a user and records the side effects', async () => {
    const { updateUserBanStatus } = await import('./adminService.js');
    const user = {
      _id: 'user-id',
      telegramId: '123456',
      save: vi.fn().mockResolvedValue(),
    };
    userFindById.mockResolvedValue(user);

    await updateUserBanStatus('user-id', {
      banned: true,
      reason: 'Spam bids',
      adminLabel: 'root-admin',
    });

    expect(user.banned).toBe(true);
    expect(user.bannedAt).toBeInstanceOf(Date);
    expect(user.banReason).toBe('Spam bids');
    expect(user.save).toHaveBeenCalled();
    expect(recordAuditLog).toHaveBeenCalledWith({
      actor: 'root-admin',
      action: 'user.ban',
      entityType: 'user',
      entityId: 'user-id',
      reason: 'Spam bids',
      metadata: { telegramId: '123456' },
    });
    expect(sendBotMessage).toHaveBeenCalledWith(
      '123456',
      'Your Telegram Auction account has been restricted by root-admin.\nReason: Spam bids'
    );
    expect(emitPlatformUpdate).toHaveBeenCalledWith('users:update', {
      type: 'user:ban-changed',
      userId: 'user-id',
      banned: true,
    });
    expect(emitPlatformUpdate).toHaveBeenCalledWith('dashboard:update', {
      type: 'user:ban-changed',
      userId: 'user-id',
      banned: true,
    });
  });

  it('rejects a seller approval request and records the side effects', async () => {
    const { updateSellerApprovalStatus } = await import('./adminService.js');
    const user = {
      _id: 'user-id',
      telegramId: '123456',
      save: vi.fn().mockResolvedValue(),
    };
    userFindById.mockResolvedValue(user);

    await updateSellerApprovalStatus('user-id', {
      approved: false,
      reason: 'Incomplete profile',
      adminLabel: 'root-admin',
    });

    expect(user.sellerApproved).toBe(false);
    expect(user.sellerApprovalStatus).toBe('rejected');
    expect(user.approvedAt).toBeNull();
    expect(user.approvedBy).toBe('root-admin');
    expect(user.approvalReviewedAt).toBeInstanceOf(Date);
    expect(user.approvalRejectionReason).toBe('Incomplete profile');
    expect(user.save).toHaveBeenCalled();
    expect(recordAuditLog).toHaveBeenCalledWith({
      actor: 'root-admin',
      action: 'seller.reject',
      entityType: 'user',
      entityId: 'user-id',
      reason: 'Incomplete profile',
      metadata: { telegramId: '123456' },
    });
    expect(sendBotMessage).toHaveBeenCalledWith(
      '123456',
      'Your seller approval request was rejected by root-admin.\nReason: Incomplete profile'
    );
    expect(emitPlatformUpdate).toHaveBeenCalledWith('users:update', {
      type: 'seller:approval-reviewed',
      userId: 'user-id',
      approved: false,
    });
    expect(emitPlatformUpdate).toHaveBeenCalledWith('dashboard:update', {
      type: 'seller:approval-reviewed',
      userId: 'user-id',
      approved: false,
    });
  });
});
