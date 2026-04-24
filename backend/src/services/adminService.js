import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import bot from '../bot/instance.js';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const createPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(Math.ceil(total / limit), 1),
});

const buildUserQuery = ({ search = '', role, banned }) => {
  const query = {};

  if (role && role !== 'all') {
    query.role = role;
  }

  if (banned === 'true') {
    query.banned = true;
  } else if (banned === 'false') {
    query.banned = false;
  }

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { telegramId: { $regex: search, $options: 'i' } },
    ];
  }

  return query;
};

const buildBidQuery = ({ auctionId, bidderId }) => {
  const query = {};

  if (auctionId) {
    query.auction = auctionId;
  }

  if (bidderId) {
    query.bidder = bidderId;
  }

  return query;
};

export const getDashboardStats = async () => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [
    usersCount,
    bannedUsersCount,
    auctionsByStatus,
    totalBids,
    totalVolumeData,
    recentAuctions,
    recentBids,
    auctionTrend,
    bidTrend,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ banned: true }),
    Auction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Bid.countDocuments(),
    Auction.aggregate([
      { $match: { status: 'ended', highestBidder: { $ne: null } } },
      { $group: { _id: null, totalVolume: { $sum: '$currentBid' } } },
    ]),
    Auction.find()
      .populate('seller', 'username firstName lastName')
      .populate('highestBidder', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5),
    Bid.find()
      .populate('auction', 'itemName')
      .populate('bidder', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5),
    Auction.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Bid.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const auctionStatusMap = auctionsByStatus.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const buildDailySeries = (rows) => {
    const rowMap = new Map(rows.map((row) => [row._id, row.count]));
    const labels = [];
    const data = [];

    for (let index = 0; index < 7; index += 1) {
      const day = new Date(sevenDaysAgo.getTime() + index * 24 * 60 * 60 * 1000);
      const label = day.toISOString().slice(0, 10);
      labels.push(label);
      data.push(rowMap.get(label) || 0);
    }

    return { labels, data };
  };

  return {
    overview: {
      totalUsers: usersCount,
      bannedUsers: bannedUsersCount,
      totalAuctions:
        (auctionStatusMap.active || 0) +
        (auctionStatusMap.ended || 0) +
        (auctionStatusMap.cancelled || 0) +
        (auctionStatusMap.pending || 0),
      activeAuctions: auctionStatusMap.active || 0,
      endedAuctions: auctionStatusMap.ended || 0,
      cancelledAuctions: auctionStatusMap.cancelled || 0,
      totalBids,
      totalVolume: totalVolumeData[0]?.totalVolume || 0,
    },
    trends: {
      auctions: buildDailySeries(auctionTrend),
      bids: buildDailySeries(bidTrend),
    },
    recentAuctions,
    recentBids,
  };
};

export const listUsersForAdmin = async ({ search, role, banned, page, limit }) => {
  const currentPage = toPositiveInt(page, 1);
  const perPage = Math.min(toPositiveInt(limit, 20), 100);
  const query = buildUserQuery({ search, role, banned });

  const [items, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((currentPage - 1) * perPage).limit(perPage),
    User.countDocuments(query),
  ]);

  return {
    items,
    pagination: createPagination(currentPage, perPage, total),
  };
};

export const updateUserBanStatus = async (userId, { banned, reason = '', adminLabel = 'Admin Panel' }) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  user.banned = Boolean(banned);
  user.bannedAt = user.banned ? new Date() : null;
  user.banReason = user.banned ? reason : '';
  await user.save();

  if (bot && user.telegramId) {
    try {
      await bot.sendMessage(
        user.telegramId,
        user.banned
          ? `Your Telegram Auction account has been restricted by ${adminLabel}.${reason ? `\nReason: ${reason}` : ''}`
          : 'Your Telegram Auction account restriction has been lifted.'
      );
    } catch (error) {
      console.error('Failed to notify user about ban update:', error);
    }
  }

  return user;
};

export const listBidsForAdmin = async ({ auctionId, bidderId, page, limit }) => {
  const currentPage = toPositiveInt(page, 1);
  const perPage = Math.min(toPositiveInt(limit, 20), 100);
  const query = buildBidQuery({ auctionId, bidderId });

  const [items, total] = await Promise.all([
    Bid.find(query)
      .populate('auction', 'itemName status')
      .populate('bidder', 'username firstName lastName telegramId')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage),
    Bid.countDocuments(query),
  ]);

  return {
    items,
    pagination: createPagination(currentPage, perPage, total),
  };
};

export const getDetailedStats = async () => {
  const [topSellers, topBidders, statusBreakdown, highestBids, latestBids] = await Promise.all([
    Auction.aggregate([
      { $group: { _id: '$seller', auctionsCreated: { $sum: 1 }, totalValue: { $sum: '$currentBid' } } },
      { $sort: { auctionsCreated: -1, totalValue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } },
      { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
    ]),
    Bid.aggregate([
      { $group: { _id: '$bidder', bidsPlaced: { $sum: 1 }, maxBid: { $max: '$amount' } } },
      { $sort: { bidsPlaced: -1, maxBid: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'bidder' } },
      { $unwind: { path: '$bidder', preserveNullAndEmptyArrays: true } },
    ]),
    Auction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Auction.find({ highestBidder: { $ne: null } })
      .populate('highestBidder', 'username firstName lastName')
      .sort({ currentBid: -1 })
      .limit(10),
    Bid.find()
      .populate('auction', 'itemName')
      .populate('bidder', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20),
  ]);

  return {
    topSellers,
    topBidders,
    statusBreakdown,
    highestBids,
    latestBids,
  };
};
