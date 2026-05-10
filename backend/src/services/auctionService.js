import bot from '../bot/instance.js';
import { config } from '../config/env.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import { createPagination, parsePagination } from '../utils/pagination.js';
import { recordAuditLog } from './auditService.js';
import { emitAuctionRoomUpdate, emitPlatformUpdate } from './liveUpdateService.js';
import { sendBotMessage } from './notificationService.js';

const getBidIncrement = (auction) => Math.max(Number(auction.bidIncrement) || 1, 1);
const getAuctionType = (auction) => auction.auctionType || 'standard';
const isDutchAuction = (auction) => getAuctionType(auction) === 'dutch';
const isSealedBidAuction = (auction) => getAuctionType(auction) === 'sealed_bid';
const isReverseAuction = (auction) => getAuctionType(auction) === 'reverse';
const escapeTelegramMarkdown = (value) => String(value ?? '').replace(/([-_*[\]()~`>#+=|{}.!\\])/g, '\\$1');
const hasMediaAssets = (auction) => Array.isArray(auction.mediaAssets) && auction.mediaAssets.length > 0;
const getPrimaryMediaAsset = (auction) => (hasMediaAssets(auction) ? auction.mediaAssets[0] : null);
const getMediaSource = (asset) => asset?.fileId || asset?.sourceUrl || null;
const getAuctionStartingValue = (auction) =>
  isDutchAuction(auction)
    ? Number(auction.startingPrice || auction.currentBid || 0)
    : Number(auction.startingPrice || 0);
export const getCurrentDutchPrice = (auction, at = new Date()) => {
  const openingPrice = Number(auction.startingPrice) || 0;
  const floorPrice = Number(auction.dutchFloorPrice) || 0;
  const dropAmount = Number(auction.dutchDropAmount) || 0;
  const dropIntervalMinutes = Number(auction.dutchDropIntervalMinutes) || 0;

  if (!isDutchAuction(auction) || !dropAmount || !dropIntervalMinutes || auction.status !== 'active') {
    return Number(auction.currentBid) || openingPrice;
  }

  const elapsedMs = Math.max(new Date(at).getTime() - new Date(auction.createdAt).getTime(), 0);
  const completedSteps = Math.floor(elapsedMs / (dropIntervalMinutes * 60 * 1000));
  const droppedPrice = openingPrice - completedSteps * dropAmount;
  return Math.max(droppedPrice, floorPrice);
};

export const hydrateAuctionDynamicState = async (auction, { persist = false } = {}) => {
  if (!auction) {
    return auction;
  }

  if (isDutchAuction(auction) && auction.status === 'active') {
    const currentDutchPrice = getCurrentDutchPrice(auction);
    if (Number(auction.currentBid) !== currentDutchPrice) {
      auction.currentBid = currentDutchPrice;
      if (persist) {
        await auction.save();
      }
    }
  }

  return auction;
};

const emitAuctionLifecycleUpdate = (type, auction) => {
  const payload = {
    type,
    auctionId: String(auction._id),
    status: auction.status,
  };

  emitPlatformUpdate('platform:update', payload);
  emitPlatformUpdate('dashboard:update', payload);
  emitPlatformUpdate('auctions:update', payload);
  emitAuctionRoomUpdate(auction._id, 'auction:update', payload);
};
const getAuctionDeepLink = async (action, auctionId) => {
  if (!bot) {
    return null;
  }

  const botProfile = await bot.getMe();
  return `https://t.me/${botProfile.username}?start=${action}_${auctionId}`;
};

const getBidderSortTime = (profile) => profile.maxBidCreatedAt?.getTime() || profile.firstBidAt.getTime();
const compareBidderProfiles = (left, right) =>
  right.ceiling - left.ceiling || getBidderSortTime(left) - getBidderSortTime(right);

const buildBidderProfiles = async (auctionId) => {
  const bids = await Bid.find({ auction: auctionId })
    .populate('bidder', 'telegramId username firstName lastName banned')
    .sort({ createdAt: 1 });

  const profiles = new Map();

  bids.forEach((bid) => {
    if (!bid.bidder) {
      return;
    }

    const bidderId = bid.bidder._id.toString();
    const ceiling = Math.max(Number(bid.amount) || 0, Number(bid.maxAutoBid) || 0);
    const profile = profiles.get(bidderId) || {
      bidderId,
      bidder: bid.bidder,
      firstBidAt: bid.createdAt,
      maxBidCreatedAt: bid.createdAt,
      highestCommittedAmount: 0,
      ceiling: 0,
    };

    profile.highestCommittedAmount = Math.max(profile.highestCommittedAmount, Number(bid.amount) || 0);

    if (ceiling > profile.ceiling || (ceiling === profile.ceiling && bid.createdAt < profile.maxBidCreatedAt)) {
      profile.ceiling = ceiling;
      profile.maxBidCreatedAt = bid.createdAt;
    }

    profiles.set(bidderId, profile);
  });

  return Array.from(profiles.values()).sort(compareBidderProfiles);
};

const resolveAuctionBidState = (auction, profiles) => {
  if (!profiles.length) {
    return {
      leader: null,
      runnerUp: null,
      currentBid: auction.startingPrice,
    };
  }

  const increment = getBidIncrement(auction);
  const [leader, runnerUp] = profiles;

  if (!runnerUp) {
    return {
      leader,
      runnerUp: null,
      currentBid: Math.max(
        Number(auction.currentBid) || Number(auction.startingPrice) || 0,
        leader.highestCommittedAmount
      ),
    };
  }

  const competitiveBid = Math.min(leader.ceiling, runnerUp.ceiling + increment);
  return {
    leader,
    runnerUp,
    currentBid: Math.min(
      Math.max(Number(auction.currentBid) || Number(auction.startingPrice) || 0, competitiveBid),
      leader.ceiling
    ),
  };
};

const notifyAuctionWatchers = async (auction, text, { excludeTelegramIds = [], replyMarkup } = {}) => {
  const watchers = await User.find({
    watchlist: auction._id,
    telegramId: { $exists: true, $ne: '' },
    banned: false,
  }).select('telegramId');

  const excluded = new Set(excludeTelegramIds.filter(Boolean).map((value) => String(value)));

  await Promise.allSettled(
    watchers
      .filter((watcher) => !excluded.has(String(watcher.telegramId)))
      .map((watcher) =>
        sendBotMessage(watcher.telegramId, text, {
          parse_mode: 'Markdown',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        })
      )
  );
};

const buildAuctionReplyMarkup = async (auction) => {
  if (!bot || auction.status !== 'active') {
    return undefined;
  }

  const bidUrl = await getAuctionDeepLink('bid', auction._id);
  const buttons = [
    [
      {
        text: isDutchAuction(auction) ? 'Accept Current Price' : 'Place Bid',
        url: bidUrl,
      },
    ],
  ];

  if (auction.buyNowPrice && !isDutchAuction(auction) && !isSealedBidAuction(auction) && !isReverseAuction(auction)) {
    const buyUrl = await getAuctionDeepLink('buy', auction._id);
    buttons.push([
      {
        text: `Buy Now ${auction.buyNowPrice} ETB`,
        url: buyUrl,
      },
    ]);
  }

  buttons.push([{ text: 'Watch Auction', callback_data: `watch_toggle_${auction._id}` }]);

  return { inline_keyboard: buttons };
};

export const formatAuctionText = (auction, seller, highestBidder = null) => {
  const displayAmount = isDutchAuction(auction) ? getCurrentDutchPrice(auction) : auction.currentBid;
  const itemName = escapeTelegramMarkdown(auction.itemName);
  const description = escapeTelegramMarkdown(auction.description);
  const category = escapeTelegramMarkdown(auction.category);
  const tags = auction.tags?.length ? auction.tags.map((tag) => escapeTelegramMarkdown(tag)).join(', ') : '';
  const auctionType = escapeTelegramMarkdown(String(auction.auctionType || 'standard').replace(/_/g, ' '));
  const sellerLabel = escapeTelegramMarkdown(
    seller.username ? `@${seller.username}` : seller.firstName || 'Unknown seller'
  );
  let text = `*NEW AUCTION*\n\n`;
  text += `*Item:* ${itemName}\n`;
  text += `*Description:* ${description}\n\n`;
  text += `*Starting Price:* ${getAuctionStartingValue(auction)} ETB\n`;
  text += `*Minimum Increment:* ${getBidIncrement(auction)} ETB\n`;
  text += `*Auction Type:* ${auctionType}\n`;

  if (auction.buyNowPrice && !isSealedBidAuction(auction) && !isReverseAuction(auction) && !isDutchAuction(auction)) {
    text += `*Buy Now:* ${auction.buyNowPrice} ETB\n`;
  }

  if (isDutchAuction(auction)) {
    text += `*Current Dutch Price:* ${displayAmount} ETB\n`;
    text += `*Floor Price:* ${auction.dutchFloorPrice} ETB\n`;
    text += `*Price Drop:* ${auction.dutchDropAmount} ETB every ${auction.dutchDropIntervalMinutes} min\n`;
  }

  if (auction.category) {
    text += `*Category:* ${category}\n`;
  }

  if (auction.tags?.length) {
    text += `*Tags:* ${tags}\n`;
  }

  if (hasMediaAssets(auction)) {
    text += `*Media:* ${auction.mediaAssets.length} file(s)\n`;
  }

  if (isSealedBidAuction(auction)) {
    text += `*Sealed Bids:* ${auction.bidCount || 0} received\n`;
  } else if (isReverseAuction(auction) && highestBidder) {
    const username = escapeTelegramMarkdown(
      highestBidder.username ? `@${highestBidder.username}` : highestBidder.firstName || 'Unknown bidder'
    );
    text += `*Current Lowest Bid:* ${auction.currentBid} ETB (by ${username})\n`;
  } else if (highestBidder) {
    const username = escapeTelegramMarkdown(
      highestBidder.username ? `@${highestBidder.username}` : highestBidder.firstName || 'Unknown bidder'
    );
    text += `*Current Highest Bid:* ${displayAmount} ETB (by ${username})\n`;
  } else if (isDutchAuction(auction)) {
    text += `*Current Price:* ${displayAmount} ETB\n`;
  } else {
    text += `*Current Highest Bid:* No bids yet. Be the first!\n`;
  }

  const endTime = escapeTelegramMarkdown(new Date(auction.endTime).toLocaleString('en-US'));
  text += `\n*Ends At:* ${endTime}\n`;
  text += `*Seller:* ${sellerLabel}`;

  return text;
};

export const postAuctionToChannel = async (auctionId) => {
  try {
    const auction = await Auction.findById(auctionId).populate('seller');
    if (!auction || !bot) {
      throw new Error('Auction not found or bot unavailable.');
    }

    await hydrateAuctionDynamicState(auction, { persist: true });
    const text = formatAuctionText(auction, auction.seller);
    const replyMarkup = await buildAuctionReplyMarkup(auction);
    const mediaAssets = hasMediaAssets(auction)
      ? auction.mediaAssets
      : [
          ...(auction.imageUrl ? [{ kind: 'photo', fileId: auction.imageUrl, caption: '' }] : []),
          ...(auction.videoUrl ? [{ kind: 'video', fileId: auction.videoUrl, caption: '' }] : []),
        ];

    let sentMessage;
    if (mediaAssets.length > 1) {
      const [primaryAsset, ...otherAssets] = mediaAssets;
      const primarySource = getMediaSource(primaryAsset);
      sentMessage =
        primaryAsset.kind === 'video'
          ? await bot.sendVideo(config.CHANNEL_ID, primarySource, {
              caption: text,
              parse_mode: 'Markdown',
              reply_markup: replyMarkup,
            })
          : await bot.sendPhoto(config.CHANNEL_ID, primarySource, {
              caption: text,
              parse_mode: 'Markdown',
              reply_markup: replyMarkup,
            });

      for (const asset of otherAssets) {
        const assetSource = getMediaSource(asset);
        if (asset.kind === 'video') {
          await bot.sendVideo(config.CHANNEL_ID, assetSource, {
            caption: asset.caption || undefined,
            reply_to_message_id: sentMessage.message_id,
          });
        } else {
          await bot.sendPhoto(config.CHANNEL_ID, assetSource, {
            caption: asset.caption || undefined,
            reply_to_message_id: sentMessage.message_id,
          });
        }
      }
    } else if (mediaAssets[0]?.kind === 'video') {
      sentMessage = await bot.sendVideo(config.CHANNEL_ID, getMediaSource(mediaAssets[0]), {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    } else if (mediaAssets[0]?.kind === 'photo') {
      sentMessage = await bot.sendPhoto(config.CHANNEL_ID, getMediaSource(mediaAssets[0]), {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    } else if (auction.videoUrl) {
      sentMessage = await bot.sendVideo(config.CHANNEL_ID, auction.videoUrl, {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    } else if (auction.imageUrl) {
      sentMessage = await bot.sendPhoto(config.CHANNEL_ID, auction.imageUrl, {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    } else {
      sentMessage = await bot.sendMessage(config.CHANNEL_ID, text, {
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    }

    auction.channelMessageId = sentMessage.message_id;
    await auction.save();
    return true;
  } catch (error) {
    console.error('Error posting to channel:', error);
    return false;
  }
};

export const updateChannelAuctionPost = async (auctionId) => {
  try {
    const auction = await Auction.findById(auctionId).populate('seller').populate('highestBidder');

    if (!auction || !auction.channelMessageId || !bot) {
      return;
    }

    await hydrateAuctionDynamicState(auction, { persist: true });
    const text = formatAuctionText(auction, auction.seller, auction.highestBidder);
    const replyMarkup = await buildAuctionReplyMarkup(auction);
    const primaryMedia = getPrimaryMediaAsset(auction);

    if (primaryMedia || auction.imageUrl || auction.videoUrl) {
      await bot.editMessageCaption(text, {
        chat_id: config.CHANNEL_ID,
        message_id: auction.channelMessageId,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    } else {
      await bot.editMessageText(text, {
        chat_id: config.CHANNEL_ID,
        message_id: auction.channelMessageId,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    }
  } catch (error) {
    console.error('Error updating channel post:', error);
  }
};

const finalizeSealedBidAuction = async (auction) => {
  const bids = await Bid.find({ auction: auction._id }).populate('bidder').sort({ amount: -1, createdAt: 1 });
  const winnerBid = bids[0] || null;

  auction.bidCount = bids.length;
  auction.currentBid = winnerBid ? winnerBid.amount : auction.startingPrice;
  auction.highestBidder = winnerBid?.bidder?._id || null;
  await auction.save();
  await auction.populate(['seller', 'highestBidder']);
};

const finalizeReverseAuction = async (auction) => {
  const bids = await Bid.find({ auction: auction._id }).populate('bidder').sort({ amount: 1, createdAt: 1 });
  const winnerBid = bids[0] || null;

  auction.bidCount = bids.length;
  auction.currentBid = winnerBid ? winnerBid.amount : auction.startingPrice;
  auction.highestBidder = winnerBid?.bidder?._id || null;
  await auction.save();
  await auction.populate(['seller', 'highestBidder']);
};

export const endAuction = async (auction) => {
  try {
    if (isSealedBidAuction(auction)) {
      await finalizeSealedBidAuction(auction);
    } else if (isReverseAuction(auction)) {
      await finalizeReverseAuction(auction);
    } else if (isDutchAuction(auction)) {
      await hydrateAuctionDynamicState(auction, { persist: true });
    }

    auction.status = 'ended';
    await auction.save();

    await auction.populate(['seller', 'highestBidder']);
    await updateChannelAuctionPost(auction._id);

    const reserveMet = !auction.reservePrice || auction.currentBid >= auction.reservePrice;

    try {
      if (bot) {
        const winnerName = auction.highestBidder
          ? auction.highestBidder.username
            ? `@${auction.highestBidder.username}`
            : auction.highestBidder.firstName
          : 'No one';
        const safeItemName = escapeTelegramMarkdown(auction.itemName);
        const safeWinnerName = escapeTelegramMarkdown(winnerName);

        const text = `*AUCTION ENDED*\n\n*Item:* ${safeItemName}\n${
          auction.highestBidder && reserveMet
            ? isReverseAuction(auction)
              ? `*Winner:* ${safeWinnerName} with the lowest bid of ${auction.currentBid} ETB!`
              : `*Winner:* ${safeWinnerName} with ${auction.currentBid} ETB!`
            : auction.highestBidder
              ? `Reserve price was not met. Final bid: ${auction.currentBid} ETB.`
              : 'Unsold. No bids were placed.'
        }`;

        await bot.sendMessage(config.CHANNEL_ID, text, {
          reply_to_message_id: auction.channelMessageId,
          parse_mode: 'Markdown',
        });
      }
    } catch (error) {
      console.error('Could not announce end in channel', error);
    }

    try {
      if (bot && auction.seller?.telegramId) {
        const safeItemName = escapeTelegramMarkdown(auction.itemName);
        const safeWinnerFirstName = escapeTelegramMarkdown(auction.highestBidder?.firstName || 'Unknown buyer');
        const safeWinnerUsername = escapeTelegramMarkdown(`@${auction.highestBidder?.username || 'No username'}`);
        if (auction.highestBidder && reserveMet) {
          await bot.sendMessage(
            auction.seller.telegramId,
            `Your auction for *${safeItemName}* has ended.\nWinner: ${safeWinnerFirstName} (${safeWinnerUsername})\nFinal Price: ${auction.currentBid} ETB\n\nPlease contact them to arrange payment or delivery.`,
            { parse_mode: 'Markdown' }
          );
        } else if (auction.highestBidder) {
          await bot.sendMessage(
            auction.seller.telegramId,
            `Your auction for *${safeItemName}* ended without a sale because the reserve price was not met.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await bot.sendMessage(
            auction.seller.telegramId,
            `Your auction for *${safeItemName}* has ended without any bids.`,
            { parse_mode: 'Markdown' }
          );
        }
      }
    } catch (error) {
      console.error('Could not DM seller', error);
    }

    try {
      if (bot && auction.highestBidder?.telegramId && reserveMet) {
        const safeItemName = escapeTelegramMarkdown(auction.itemName);
        const safeSellerFirstName = escapeTelegramMarkdown(auction.seller.firstName || 'Unknown seller');
        const safeSellerUsername = escapeTelegramMarkdown(`@${auction.seller.username || 'No username'}`);
        await bot.sendMessage(
          auction.highestBidder.telegramId,
          `Congratulations! You won the auction for *${safeItemName}*!\nFinal Price: ${auction.currentBid} ETB\n\nSeller: ${safeSellerFirstName} (${safeSellerUsername})\nPlease contact them to arrange payment or delivery.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      console.error('Could not DM buyer', error);
    }

    const bidUrl = await getAuctionDeepLink('bid', auction._id);
    await notifyAuctionWatchers(
      auction,
      `Watchlist update: *${escapeTelegramMarkdown(auction.itemName)}* has ended.${
        auction.highestBidder && reserveMet
          ? ` Winning bid: ${auction.currentBid} ETB.`
          : auction.highestBidder
            ? ` Reserve price was not met.`
            : ` No bids were placed.`
      }`,
      {
        excludeTelegramIds: [auction.seller?.telegramId, auction.highestBidder?.telegramId],
        replyMarkup: bidUrl ? { inline_keyboard: [[{ text: 'View Auction', url: bidUrl }]] } : undefined,
      }
    );

    await User.updateMany({ watchlist: auction._id }, { $pull: { watchlist: auction._id } });
    emitAuctionLifecycleUpdate('auction:ended', auction);
  } catch (error) {
    console.error('Error ending auction:', error);
  }
};

export const searchActiveAuctions = async (term, limit = 5) => {
  const query = {
    status: 'active',
  };

  if (term) {
    query.$or = [
      { itemName: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } },
      { category: { $regex: term, $options: 'i' } },
      { tags: { $elemMatch: { $regex: term, $options: 'i' } } },
    ];
  }

  const items = await Auction.find(query)
    .populate('seller', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 5, 1), 10));

  await Promise.all(items.map((auction) => hydrateAuctionDynamicState(auction)));
  return items;
};

export const listWatchedAuctionsForUser = async (telegramId) => {
  const user = await User.findOne({ telegramId }).populate({
    path: 'watchlist',
    populate: {
      path: 'seller highestBidder',
      select: 'username firstName lastName telegramId',
    },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const items = (user.watchlist || []).filter((auction) => ['pending', 'active'].includes(auction.status));
  await Promise.all(items.map((auction) => hydrateAuctionDynamicState(auction)));
  return { user, items };
};

export const toggleAuctionWatchlist = async (auctionId, telegramId) => {
  const [auction, user] = await Promise.all([
    Auction.findById(auctionId).select('itemName status'),
    User.findOne({ telegramId }),
  ]);

  if (!user) {
    const error = new Error('Please use /start first.');
    error.statusCode = 404;
    throw error;
  }

  if (!auction) {
    const error = new Error('Auction not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!['pending', 'active'].includes(auction.status)) {
    const error = new Error('Only pending or active auctions can be watched.');
    error.statusCode = 400;
    throw error;
  }

  const watchlist = user.watchlist || [];
  const alreadyWatching = watchlist.some((entry) => entry.toString() === auctionId);
  if (alreadyWatching) {
    user.watchlist = watchlist.filter((entry) => entry.toString() !== auctionId);
  } else {
    user.watchlist = [...watchlist, auction._id];
  }

  await user.save();

  emitPlatformUpdate('users:update', { type: 'watchlist:changed', userId: String(user._id), auctionId });

  return {
    auction,
    watching: !alreadyWatching,
  };
};

export const listAuctionsForAdmin = async ({ search = '', status, page = 1, limit = 20 }) => {
  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { itemName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { tags: { $elemMatch: { $regex: search, $options: 'i' } } },
    ];
  }

  const { currentPage, perPage, skip } = parsePagination({ page, limit });

  const [items, total] = await Promise.all([
    Auction.find(query)
      .populate('seller', 'username firstName lastName telegramId banned sellerApproved sellerApprovalStatus')
      .populate('highestBidder', 'username firstName lastName telegramId banned')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage),
    Auction.countDocuments(query),
  ]);

  await Promise.all(items.map((auction) => hydrateAuctionDynamicState(auction)));

  return {
    items,
    pagination: createPagination(currentPage, perPage, total),
  };
};

export const getAuctionAdminDetails = async (auctionId) => {
  const auction = await Auction.findById(auctionId)
    .populate('seller', 'username firstName lastName telegramId role banned sellerApproved sellerApprovalStatus')
    .populate('highestBidder', 'username firstName lastName telegramId role banned');

  if (!auction) {
    return null;
  }

  await hydrateAuctionDynamicState(auction);

  const bids = await Bid.find({ auction: auction._id })
    .populate('bidder', 'username firstName lastName telegramId')
    .sort({ createdAt: -1 })
    .limit(50);

  return { auction, bids };
};

export const notifyAuctionCancelled = async (auction, { reason = '', adminLabel = 'Admin Panel' } = {}) => {
  if (!bot) {
    return;
  }

  const reasonLine = reason ? `\nReason: ${reason}` : '';

  try {
    if (auction.channelMessageId) {
      await bot.sendMessage(config.CHANNEL_ID, `Auction cancelled: ${auction.itemName}.${reasonLine}`, {
        reply_to_message_id: auction.channelMessageId,
      });
    }
  } catch (error) {
    console.error('Failed to notify channel about auction cancellation:', error);
  }

  await sendBotMessage(
    auction.seller?.telegramId,
    `Your auction "${auction.itemName}" was cancelled by ${adminLabel}.${reasonLine}`
  );

  await sendBotMessage(
    auction.highestBidder?.telegramId,
    `Bidding has been closed because the auction "${auction.itemName}" was cancelled.${reasonLine}`
  );
};

export const cancelAuctionByAdmin = async (auctionId, { reason = '', adminLabel = 'Admin Panel' } = {}) => {
  const auction = await Auction.findById(auctionId).populate('seller highestBidder');
  if (!auction) {
    const error = new Error('Auction not found.');
    error.statusCode = 404;
    throw error;
  }

  if (auction.status === 'cancelled') {
    return auction;
  }

  if (auction.status === 'ended') {
    const error = new Error('Ended auctions cannot be cancelled.');
    error.statusCode = 400;
    throw error;
  }

  auction.status = 'cancelled';
  await auction.save();

  await recordAuditLog({
    actor: adminLabel,
    action: 'auction.cancel',
    entityType: 'auction',
    entityId: auction._id,
    reason,
    metadata: { sellerId: auction.seller?._id },
  });

  await notifyAuctionCancelled(auction, { reason, adminLabel });
  emitAuctionLifecycleUpdate('auction:cancelled', auction);
  return auction;
};

export const approveAuctionByAdmin = async (auctionId, { adminLabel = 'Admin Panel' } = {}) => {
  const auction = await Auction.findById(auctionId).populate('seller highestBidder');
  if (!auction) {
    const error = new Error('Auction not found.');
    error.statusCode = 404;
    throw error;
  }

  if (auction.status !== 'pending') {
    const error = new Error('Only pending auctions can be approved.');
    error.statusCode = 400;
    throw error;
  }

  auction.status = 'active';
  await auction.save();

  await recordAuditLog({
    actor: adminLabel,
    action: 'auction.approve',
    entityType: 'auction',
    entityId: auction._id,
    metadata: { sellerId: auction.seller?._id },
  });

  await postAuctionToChannel(auction._id);
  await sendBotMessage(
    auction.seller?.telegramId,
    `Your auction "${auction.itemName}" was approved by ${adminLabel} and is now live in the channel.`
  );
  await notifyAuctionWatchers(
    auction,
    `Watchlist update: *${escapeTelegramMarkdown(auction.itemName)}* is now live for bidding.`,
    {
      excludeTelegramIds: [auction.seller?.telegramId],
      replyMarkup: await buildAuctionReplyMarkup(auction),
    }
  );
  emitAuctionLifecycleUpdate('auction:approved', auction);

  return Auction.findById(auctionId).populate('seller highestBidder');
};

export const rejectAuctionByAdmin = async (auctionId, { reason = '', adminLabel = 'Admin Panel' } = {}) => {
  const auction = await Auction.findById(auctionId).populate('seller highestBidder');
  if (!auction) {
    const error = new Error('Auction not found.');
    error.statusCode = 404;
    throw error;
  }

  if (auction.status !== 'pending') {
    const error = new Error('Only pending auctions can be rejected.');
    error.statusCode = 400;
    throw error;
  }

  auction.status = 'cancelled';
  await auction.save();

  await recordAuditLog({
    actor: adminLabel,
    action: 'auction.reject',
    entityType: 'auction',
    entityId: auction._id,
    reason,
    metadata: { sellerId: auction.seller?._id },
  });

  await sendBotMessage(
    auction.seller?.telegramId,
    `Your auction "${auction.itemName}" was rejected by ${adminLabel}.${reason ? `\nReason: ${reason}` : ''}`
  );
  emitAuctionLifecycleUpdate('auction:rejected', auction);

  return auction;
};

export const buyNowAuction = async (auctionId, buyer) => {
  const auction = await Auction.findById(auctionId).populate('seller highestBidder');
  if (!auction) {
    const error = new Error('Auction not found.');
    error.statusCode = 404;
    throw error;
  }

  if (auction.status !== 'active') {
    const error = new Error('This auction is not active.');
    error.statusCode = 400;
    throw error;
  }

  if (!auction.buyNowPrice) {
    const error = new Error('Buy Now is not enabled for this auction.');
    error.statusCode = 400;
    throw error;
  }

  if (isDutchAuction(auction) || isSealedBidAuction(auction) || isReverseAuction(auction)) {
    const error = new Error('Buy Now is only available for standard auctions.');
    error.statusCode = 400;
    throw error;
  }

  if (auction.seller?._id.toString() === buyer._id.toString()) {
    const error = new Error('You cannot buy your own auction.');
    error.statusCode = 400;
    throw error;
  }

  auction.currentBid = auction.buyNowPrice;
  auction.highestBidder = buyer._id;
  await auction.save();

  await Bid.create({
    auction: auction._id,
    bidder: buyer._id,
    amount: auction.buyNowPrice,
  });

  await endAuction(auction);
  return Auction.findById(auctionId).populate('seller highestBidder');
};

export const acceptDutchAuctionPrice = async (auctionId, buyer) => {
  const auction = await Auction.findById(auctionId).populate('seller highestBidder');
  if (!auction) {
    const error = new Error('Auction not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!isDutchAuction(auction)) {
    const error = new Error('This is not a Dutch auction.');
    error.statusCode = 400;
    throw error;
  }

  if (auction.status !== 'active') {
    const error = new Error('This auction is no longer active.');
    error.statusCode = 400;
    throw error;
  }

  if (auction.seller?._id.toString() === buyer._id.toString()) {
    const error = new Error('You cannot accept your own auction.');
    error.statusCode = 400;
    throw error;
  }

  const acceptedPrice = getCurrentDutchPrice(auction);
  auction.currentBid = acceptedPrice;
  auction.highestBidder = buyer._id;
  auction.bidCount = (auction.bidCount || 0) + 1;
  await auction.save();

  await Bid.create({
    auction: auction._id,
    bidder: buyer._id,
    amount: acceptedPrice,
  });

  await endAuction(auction);
  return Auction.findById(auctionId).populate('seller highestBidder');
};

export const placeBidForAuction = async (auctionId, bidder, { amount, maxAutoBid = null }) => {
  const auction = await Auction.findById(auctionId).populate('seller highestBidder');
  if (!auction) {
    const error = new Error('Auction not found.');
    error.statusCode = 404;
    throw error;
  }

  if (auction.status !== 'active') {
    const error = new Error('This auction is no longer active.');
    error.statusCode = 400;
    throw error;
  }

  await hydrateAuctionDynamicState(auction, { persist: true });

  if (auction.seller?._id.toString() === bidder._id.toString()) {
    const error = new Error('You cannot bid on your own auction.');
    error.statusCode = 400;
    throw error;
  }

  if (isDutchAuction(auction)) {
    const error = new Error('Dutch auctions use the current price acceptance flow instead of manual bid amounts.');
    error.statusCode = 400;
    throw error;
  }

  if (isSealedBidAuction(auction)) {
    if (maxAutoBid !== null) {
      const error = new Error('Auto-bidding is not supported for sealed-bid auctions.');
      error.statusCode = 400;
      throw error;
    }

    if (Number(amount) < Number(auction.startingPrice)) {
      const error = new Error(`Your sealed bid must be at least ${auction.startingPrice} ETB.`);
      error.statusCode = 400;
      throw error;
    }

    const existingSealedBid = await Bid.findOne({
      auction: auction._id,
      bidder: bidder._id,
    }).sort({ amount: -1, createdAt: -1 });

    if (existingSealedBid && Number(amount) <= Number(existingSealedBid.amount)) {
      const error = new Error(
        `Your new sealed bid must be higher than your current sealed bid of ${existingSealedBid.amount} ETB.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (existingSealedBid) {
      existingSealedBid.amount = amount;
      existingSealedBid.maxAutoBid = null;
      existingSealedBid.isAutoBid = false;
      await existingSealedBid.save();
    } else {
      await Bid.create({
        auction: auction._id,
        bidder: bidder._id,
        amount,
      });
    }

    auction.bidCount = await Bid.countDocuments({ auction: auction._id });

    let extended = false;
    const timeRemaining = auction.endTime.getTime() - Date.now();
    if (timeRemaining < 5 * 60 * 1000) {
      auction.endTime = new Date(auction.endTime.getTime() + 5 * 60 * 1000);
      extended = true;
    }

    await auction.save();
    emitAuctionLifecycleUpdate('auction:bid', auction);

    return {
      auction,
      minimumBid: Number(auction.startingPrice),
      extended,
      usedAutoBid: false,
      leaderChanged: false,
    };
  }

  if (isReverseAuction(auction)) {
    if (maxAutoBid !== null) {
      const error = new Error('Auto-bidding is not supported for reverse auctions.');
      error.statusCode = 400;
      throw error;
    }

    const minimumDecrease = getBidIncrement(auction);
    const maximumAllowedBid = Number(auction.currentBid) - minimumDecrease;
    if (Number(amount) > maximumAllowedBid) {
      const error = new Error(`Your bid must be at least ${minimumDecrease} ETB lower than ${auction.currentBid} ETB.`);
      error.statusCode = 400;
      throw error;
    }

    const previousHighestBidder = auction.highestBidder;
    await Bid.create({
      auction: auction._id,
      bidder: bidder._id,
      amount,
    });

    auction.currentBid = amount;
    auction.highestBidder = bidder._id;
    auction.bidCount = (auction.bidCount || 0) + 1;

    let extended = false;
    const timeRemaining = auction.endTime.getTime() - Date.now();
    if (timeRemaining < 5 * 60 * 1000) {
      auction.endTime = new Date(auction.endTime.getTime() + 5 * 60 * 1000);
      extended = true;
    }

    await auction.save();
    await auction.populate('seller highestBidder');

    if (previousHighestBidder?.telegramId && String(previousHighestBidder._id) !== String(bidder._id)) {
      const bidUrl = await getAuctionDeepLink('bid', auction._id);
      await sendBotMessage(
        previousHighestBidder.telegramId,
        `You were undercut on *${escapeTelegramMarkdown(auction.itemName)}*. New lowest bid: ${auction.currentBid} ETB.`,
        bidUrl
          ? {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: 'Bid Again', url: bidUrl }]],
              },
            }
          : { parse_mode: 'Markdown' }
      );
    }

    await updateChannelAuctionPost(auction._id);
    emitAuctionLifecycleUpdate('auction:bid', auction);

    return {
      auction,
      minimumBid: Number(auction.currentBid) - minimumDecrease,
      extended,
      usedAutoBid: false,
      leaderChanged: true,
    };
  }

  const increment = getBidIncrement(auction);
  const minimumBid = Number(auction.currentBid) + increment;
  if (Number(amount) < minimumBid) {
    const error = new Error(`Your bid must be at least ${minimumBid} ETB.`);
    error.statusCode = 400;
    throw error;
  }

  if (maxAutoBid !== null && Number(maxAutoBid) < Number(amount)) {
    const error = new Error('Auto-bid maximum must be equal to or higher than your bid amount.');
    error.statusCode = 400;
    throw error;
  }

  const previousHighestBidder = auction.highestBidder;
  const previousBidAmount = Number(auction.currentBid) || Number(auction.startingPrice) || 0;

  await Bid.create({
    auction: auction._id,
    bidder: bidder._id,
    amount,
    maxAutoBid,
  });

  const profiles = await buildBidderProfiles(auction._id);
  const { leader, currentBid } = resolveAuctionBidState(auction, profiles);

  const autoBidNeeded =
    leader &&
    leader.bidderId !== bidder._id.toString() &&
    currentBid > previousBidAmount &&
    currentBid > leader.highestCommittedAmount;

  if (autoBidNeeded) {
    await Bid.create({
      auction: auction._id,
      bidder: leader.bidder._id,
      amount: currentBid,
      maxAutoBid: leader.ceiling,
      isAutoBid: true,
    });
  }

  auction.bidCount = await Bid.countDocuments({ auction: auction._id });
  auction.currentBid = currentBid;
  auction.highestBidder = leader?.bidder?._id || null;

  let extended = false;
  const timeRemaining = auction.endTime.getTime() - Date.now();
  if (timeRemaining < 5 * 60 * 1000) {
    auction.endTime = new Date(auction.endTime.getTime() + 5 * 60 * 1000);
    extended = true;
  }

  await auction.save();
  await auction.populate('seller highestBidder');

  const leaderChanged =
    Boolean(previousHighestBidder?._id) && String(previousHighestBidder._id) !== String(auction.highestBidder?._id);

  if (leaderChanged && previousHighestBidder?.telegramId) {
    const bidUrl = await getAuctionDeepLink('bid', auction._id);
    await sendBotMessage(
      previousHighestBidder.telegramId,
      `You have been outbid on *${escapeTelegramMarkdown(auction.itemName)}*. New highest bid: ${auction.currentBid} ETB.`,
      bidUrl
        ? {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: 'Bid Again', url: bidUrl }]],
            },
          }
        : { parse_mode: 'Markdown' }
    );
  }

  const replyMarkup = await buildAuctionReplyMarkup(auction);
  await notifyAuctionWatchers(
    auction,
    `Watchlist update: *${escapeTelegramMarkdown(auction.itemName)}* now has a highest bid of ${auction.currentBid} ETB.`,
    {
      excludeTelegramIds: [bidder.telegramId, auction.highestBidder?.telegramId, auction.seller?.telegramId],
      replyMarkup,
    }
  );

  await updateChannelAuctionPost(auction._id);
  emitAuctionLifecycleUpdate('auction:bid', auction);

  return {
    auction,
    minimumBid: Number(auction.currentBid) + increment,
    extended,
    usedAutoBid: autoBidNeeded,
    leaderChanged,
  };
};
