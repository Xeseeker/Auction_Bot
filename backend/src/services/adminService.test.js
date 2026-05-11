import { beforeEach, describe, expect, it, vi } from 'vitest';

const userFind = vi.fn();
const userCountDocuments = vi.fn();

vi.mock('../models/User.js', () => ({
  default: {
    find: userFind,
    countDocuments: userCountDocuments,
  },
}));

vi.mock('../models/Auction.js', () => ({
  default: {},
}));

vi.mock('../models/Bid.js', () => ({
  default: {},
}));

vi.mock('./auditService.js', () => ({
  recordAuditLog: vi.fn(),
}));

vi.mock('./liveUpdateService.js', () => ({
  emitPlatformUpdate: vi.fn(),
}));

vi.mock('./notificationService.js', () => ({
  sendBotMessage: vi.fn(),
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
