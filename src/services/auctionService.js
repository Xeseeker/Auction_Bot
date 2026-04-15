import bot from '../bot/instance.js';
import { config } from '../config/env.js';
import Auction from '../models/Auction.js';
import User from '../models/User.js';

/**
 * Format the standard auction text for channel or message
 * @param {Object} auction - Auction Document
 * @param {Object} seller - User Document
 * @param {Object} highestBidder - Optionally populated bidder
 */
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

/**
 * Post a new auction to the channel
 */
export const postAuctionToChannel = async (auctionId) => {
  try {
    const auction = await Auction.findById(auctionId).populate('seller');
    if (!auction) throw new Error('Auction not found');

    const text = formatAuctionText(auction, auction.seller);
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '💵 Place Bid',
            url: `https://t.me/${(await bot.getMe()).username}?start=bid_${auction._id}`
          }
        ]
      ]
    };

    let sentMessage;
    if (auction.imageUrl) {
      sentMessage = await bot.sendPhoto(config.CHANNEL_ID, auction.imageUrl, {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      });
    } else {
      sentMessage = await bot.sendMessage(config.CHANNEL_ID, text, {
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      });
    }

    // Save message ID to update it later
    auction.channelMessageId = sentMessage.message_id;
    await auction.save();
    return true;
  } catch (error) {
    console.error('Error posting to channel:', error);
    return false;
  }
};

/**
 * Update the existing auction post in the channel
 */
export const updateChannelAuctionPost = async (auctionId) => {
  try {
    const auction = await Auction.findById(auctionId)
      .populate('seller')
      .populate('highestBidder');
      
    if (!auction || !auction.channelMessageId) return;

    const text = formatAuctionText(auction, auction.seller, auction.highestBidder);
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '💵 Place Bid',
            url: `https://t.me/${(await bot.getMe()).username}?start=bid_${auction._id}`
          }
        ]
      ]
    };

    if (auction.imageUrl) {
      await bot.editMessageCaption(text, {
        chat_id: config.CHANNEL_ID,
        message_id: auction.channelMessageId,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      });
    } else {
      await bot.editMessageText(text, {
        chat_id: config.CHANNEL_ID,
        message_id: auction.channelMessageId,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      });
    }
  } catch (error) {
    console.error('Error updating channel post:', error);
  }
};

/**
 * Process auction ending, notify users, etc.
 */
export const endAuction = async (auction) => {
  try {
    auction.status = 'ended';
    await auction.save();

    await auction.populate(['seller', 'highestBidder']);

    // 1. Announce in Channel
    try {
      const winnerName = auction.highestBidder 
        ? (auction.highestBidder.username ? `@${auction.highestBidder.username}` : auction.highestBidder.firstName)
        : 'No one';
        
      const text = `🏁 *AUCTION ENDED* 🏁\n\n📦 *Item:* ${auction.itemName}\n` +
                   (auction.highestBidder ? `🏆 *Winner:* ${winnerName} with ${auction.currentBid} ETB!` : `😢 Unsold. No bids were placed.`);
                   
      await bot.sendMessage(config.CHANNEL_ID, text, {
        reply_to_message_id: auction.channelMessageId,
        parse_mode: 'Markdown'
      });
    } catch(err) {
      console.error('Could not announce end in channel', err);
    }

    // 2. DM the Seller
    try {
      if (auction.highestBidder) {
        await bot.sendMessage(
          auction.seller.telegramId, 
          `🎉 Your auction for *${auction.itemName}* has ended!\n` +
          `Winner: ${auction.highestBidder.firstName} (@${auction.highestBidder.username || 'No username'})\n` +
          `Final Price: ${auction.currentBid} ETB\n\n` +
          `Please contact them to arrange payment/delivery.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await bot.sendMessage(
          auction.seller.telegramId, 
          `😢 Your auction for *${auction.itemName}* has ended without any bids.`
        );
      }
    } catch (err) {
      console.error('Could not DM seller', err);
    }

    // 3. DM the Buyer
    try {
      if (auction.highestBidder) {
        await bot.sendMessage(
          auction.highestBidder.telegramId, 
          `🎉 Congratulations! You won the auction for *${auction.itemName}*!\n` +
          `Final Price: ${auction.currentBid} ETB\n\n` +
          `Seller: ${auction.seller.firstName} (@${auction.seller.username || 'No username'})\n` +
          `Please contact them to arrange payment/delivery.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (err) {
      console.error('Could not DM buyer', err);
    }
    
  } catch (error) {
    console.error('Error ending auction:', error);
  }
};
