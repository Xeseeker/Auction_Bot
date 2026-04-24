import bot from '../bot/instance.js';
import { config } from '../config/env.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';

export const formatAuctionText = (auction, seller, highestBidder = null) => {
  let text = `🔥 *NEW AUCTION* 🔥\n\n`;
  text += `📦 *Item:* ${auction.itemName}\n`;
  text += `📝 *Description:* ${auction.description}\n\n`;
  text += `💰 *Starting Price:* ${auction.startingPrice} ETB\n`;

  if (highestBidder) {
    const username = highestBidder.username ? `@${highestBidder.username}` : highestBidder.firstName;
    text += `🏆 *Current Highest Bid:* ${auction.currentBid} ETB (by ${username})\n`;
  } else {
    text += `🏆 *Current Highest Bid:* No bids yet. Be the first!\n`;
  }

  const endTime = new Date(auction.endTime).toLocaleString('en-US');
  text += `\n⏰ *Ends At:* ${endTime}\n`;
  text += `👤 *Seller:* ${seller.username ? `@${seller.username}` : seller.firstName}`;

  return text;
};

export const postAuctionToChannel = async (auctionId) => {
  try {
    const auction = await Auction.findById(auctionId).populate('seller');
    if (!auction || !bot) {
      throw new Error('Auction not found or bot unavailable.');
    }

    const text = formatAuctionText(auction, auction.seller);
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '💵 Place Bid',
            url: `https://t.me/${(await bot.getMe()).username}?start=bid_${auction._id}`,
          },
        ],
      ],
    };

    let sentMessage;
    if (auction.imageUrl) {
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

    const text = formatAuctionText(auction, auction.seller, auction.highestBidder);
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '💵 Place Bid',
            url: `https://t.me/${(await bot.getMe()).username}?start=bid_${auction._id}`,
          },
        ],
      ],
    };

    if (auction.imageUrl) {
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

export const endAuction = async (auction) => {
  try {
    auction.status = 'ended';
    await auction.save();

    await auction.populate(['seller', 'highestBidder']);

    try {
      if (bot) {
        const winnerName = auction.highestBidder
          ? auction.highestBidder.username
            ? `@${auction.highestBidder.username}`
            : auction.highestBidder.firstName
          : 'No one';

        const text = `🏁 *AUCTION ENDED* 🏁\n\n📦 *Item:* ${auction.itemName}\n${
          auction.highestBidder
            ? `🏆 *Winner:* ${winnerName} with ${auction.currentBid} ETB!`
            : '😢 Unsold. No bids were placed.'
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
        if (auction.highestBidder) {
          await bot.sendMessage(
            auction.seller.telegramId,
            `🎉 Your auction for *${auction.itemName}* has ended!\nWinner: ${auction.highestBidder.firstName} (@${
              auction.highestBidder.username || 'No username'
            })\nFinal Price: ${auction.currentBid} ETB\n\nPlease contact them to arrange payment or delivery.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await bot.sendMessage(
            auction.seller.telegramId,
            `😢 Your auction for *${auction.itemName}* has ended without any bids.`,
            { parse_mode: 'Markdown' }
          );
        }
      }
    } catch (error) {
      console.error('Could not DM seller', error);
    }

    try {
      if (bot && auction.highestBidder?.telegramId) {
        await bot.sendMessage(
          auction.highestBidder.telegramId,
          `🎉 Congratulations! You won the auction for *${auction.itemName}*!\nFinal Price: ${auction.currentBid} ETB\n\nSeller: ${
            auction.seller.firstName
          } (@${auction.seller.username || 'No username'})\nPlease contact them to arrange payment or delivery.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      console.error('Could not DM buyer', error);
    }
  } catch (error) {
    console.error('Error ending auction:', error);
  }
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
    ];
  }

  const currentPage = Math.max(Number(page) || 1, 1);
  const perPage = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (currentPage - 1) * perPage;

  const [items, total] = await Promise.all([
    Auction.find(query)
      .populate('seller', 'username firstName lastName telegramId banned')
      .populate('highestBidder', 'username firstName lastName telegramId banned')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage),
    Auction.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      pages: Math.max(Math.ceil(total / perPage), 1),
    },
  };
};

export const getAuctionAdminDetails = async (auctionId) => {
  const auction = await Auction.findById(auctionId)
    .populate('seller', 'username firstName lastName telegramId role banned')
    .populate('highestBidder', 'username firstName lastName telegramId role banned');

  if (!auction) {
    return null;
  }

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

  try {
    if (auction.seller?.telegramId) {
      await bot.sendMessage(
        auction.seller.telegramId,
        `Your auction "${auction.itemName}" was cancelled by ${adminLabel}.${reasonLine}`
      );
    }
  } catch (error) {
    console.error('Failed to notify seller about auction cancellation:', error);
  }

  try {
    if (auction.highestBidder?.telegramId) {
      await bot.sendMessage(
        auction.highestBidder.telegramId,
        `Bidding has been closed because the auction "${auction.itemName}" was cancelled.${reasonLine}`
      );
    }
  } catch (error) {
    console.error('Failed to notify highest bidder about auction cancellation:', error);
  }
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

  await notifyAuctionCancelled(auction, { reason, adminLabel });
  return auction;
};
