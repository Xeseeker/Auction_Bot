import bot from './instance.js';
import stateManager from './stateManager.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import { postAuctionToChannel, updateChannelAuctionPost } from '../services/auctionService.js';

export const setupCommands = () => {
  if (!bot) return;

  bot.onText(/\/start(?:\s+(.*))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const payload = match[1];

    let user = await User.findOne({ telegramId });
    if (!user) {
      user = await User.create({
        telegramId,
        username: msg.from.username || '',
        firstName: msg.from.first_name || '',
        lastName: msg.from.last_name || '',
      });
    } else if (user.username !== msg.from.username) {
      user.username = msg.from.username || '';
      await user.save();
    }

    if (user.banned) {
      return bot.sendMessage(
        chatId,
        `Your account is currently restricted from using the auction platform.${user.banReason ? `\nReason: ${user.banReason}` : ''}`
      );
    }

    if (payload && payload.startsWith('bid_')) {
      const auctionId = payload.split('_')[1];
      const auction = await Auction.findById(auctionId).populate('seller');

      if (!auction || auction.status !== 'active') {
        return bot.sendMessage(chatId, "This auction is not active or doesn't exist.");
      }

      if (auction.seller._id.toString() === user._id.toString()) {
        return bot.sendMessage(chatId, 'You cannot bid on your own auction.');
      }

      stateManager.set(chatId, { step: 'awaiting_bid_amount', auctionId, userId: user._id });

      return bot.sendMessage(
        chatId,
        `💵 *Bidding on: ${auction.itemName}*\n\nCurrent Highest Bid: ${auction.currentBid} ETB\n\nPlease enter your bid amount (must be higher than ${auction.currentBid}):`,
        { parse_mode: 'Markdown' }
      );
    }

    return bot.sendMessage(
      chatId,
      `👋 Welcome to the Auction Bot, ${user.firstName}!\n\nUse /post to create a new auction.\nKeep an eye on the channel for active auctions!`
    );
  });

  bot.onText(/\/post/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const user = await User.findOne({ telegramId });

    if (!user) {
      return bot.sendMessage(chatId, 'Please use /start to register first.');
    }

    if (user.banned) {
      return bot.sendMessage(
        chatId,
        `Your account is restricted from posting auctions.${user.banReason ? `\nReason: ${user.banReason}` : ''}`
      );
    }

    stateManager.set(chatId, { step: 'post_name', userId: user._id });
    return bot.sendMessage(chatId, "📦 Let's post an item!\n\nPlease enter the *Item Name*:", {
      parse_mode: 'Markdown',
    });
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const state = stateManager.get(chatId);

    if (text && text.startsWith('/')) return;
    if (!state) return;

    if (state.step === 'post_name') {
      stateManager.update(chatId, { step: 'post_description', itemName: text });
      return bot.sendMessage(chatId, '📝 Great! Now write a short *Description*:', { parse_mode: 'Markdown' });
    }

    if (state.step === 'post_description') {
      stateManager.update(chatId, { step: 'post_price', description: text });
      return bot.sendMessage(chatId, '💰 Enter the *Starting Price* in ETB (numbers only):', {
        parse_mode: 'Markdown',
      });
    }

    if (state.step === 'post_price') {
      const price = Number(text);
      if (Number.isNaN(price) || price <= 0) {
        return bot.sendMessage(chatId, 'Please enter a valid positive number for the starting price:');
      }

      stateManager.update(chatId, { step: 'post_duration', startingPrice: price });
      return bot.sendMessage(chatId, '⏳ Enter the *Duration* in hours (for example 24):', {
        parse_mode: 'Markdown',
      });
    }

    if (state.step === 'post_duration') {
      const duration = Number(text);
      if (Number.isNaN(duration) || duration <= 0) {
        return bot.sendMessage(chatId, 'Please enter a valid positive number for hours:');
      }

      stateManager.update(chatId, { step: 'post_image', duration });
      return bot.sendMessage(
        chatId,
        "📸 Almost done! Please *send an image* of the item (or type 'skip' to post without an image):",
        { parse_mode: 'Markdown' }
      );
    }

    if (state.step === 'post_image') {
      let imageUrl = null;
      if (msg.photo && msg.photo.length > 0) {
        imageUrl = msg.photo[msg.photo.length - 1].file_id;
      } else if (text && text.toLowerCase() !== 'skip') {
        return bot.sendMessage(chatId, "Please send a photo or type 'skip'.");
      }

      const endTime = new Date(Date.now() + state.duration * 60 * 60 * 1000);

      const newAuction = await Auction.create({
        itemName: state.itemName,
        description: state.description,
        startingPrice: state.startingPrice,
        seller: state.userId,
        durationHours: state.duration,
        endTime,
        imageUrl,
      });

      const success = await postAuctionToChannel(newAuction._id);

      if (success) {
        await bot.sendMessage(chatId, 'Your item has been posted to the channel successfully.');
      } else {
        await bot.sendMessage(
          chatId,
          'Saved to the database, but failed to post to the channel. Ensure the bot is an admin in the channel.'
        );
      }

      stateManager.delete(chatId);
      return;
    }

    if (state.step === 'awaiting_bid_amount') {
      const amount = Number(text);
      if (Number.isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, 'Please enter a valid number for your bid.');
      }

      const [auction, bidder] = await Promise.all([
        Auction.findById(state.auctionId).populate('highestBidder'),
        User.findById(state.userId),
      ]);

      if (!auction || auction.status !== 'active') {
        stateManager.delete(chatId);
        return bot.sendMessage(chatId, 'This auction is no longer active.');
      }

      if (!bidder || bidder.banned) {
        stateManager.delete(chatId);
        return bot.sendMessage(
          chatId,
          `Your account is restricted from bidding.${bidder?.banReason ? `\nReason: ${bidder.banReason}` : ''}`
        );
      }

      if (amount <= auction.currentBid) {
        return bot.sendMessage(chatId, `Your bid must be higher than the current bid (${auction.currentBid} ETB). Try again:`);
      }

      if (auction.highestBidder && auction.highestBidder._id.toString() !== state.userId.toString()) {
        try {
          await bot.sendMessage(
            auction.highestBidder.telegramId,
            `⚠️ You have been outbid on *${auction.itemName}*! New highest bid is ${amount} ETB.`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '💵 Bid Again', url: `https://t.me/${(await bot.getMe()).username}?start=bid_${auction._id}` }]],
              },
            }
          );
        } catch (error) {
          console.error('Failed to notify previous bidder', error);
        }
      }

      auction.currentBid = amount;
      auction.highestBidder = state.userId;

      const timeRemaining = auction.endTime.getTime() - Date.now();
      if (timeRemaining < 5 * 60 * 1000) {
        auction.endTime = new Date(auction.endTime.getTime() + 5 * 60 * 1000);
        await bot.sendMessage(chatId, '⏱️ Auction time extended by 5 minutes due to a last-minute bid.', {
          parse_mode: 'Markdown',
        });
      }

      await auction.save();

      await Bid.create({
        auction: auction._id,
        bidder: state.userId,
        amount,
      });

      await bot.sendMessage(chatId, `Successfully placed your bid of ${amount} ETB.`);
      await updateChannelAuctionPost(auction._id);
      stateManager.delete(chatId);
    }
  });
};
