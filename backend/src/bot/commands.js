import bot from './instance.js';
import stateManager from './stateManager.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import {
  getCurrentDutchPrice,
  listWatchedAuctionsForUser,
  placeBidForAuction,
  searchActiveAuctions,
} from '../services/auctionService.js';
import { languageKeyboard, normalizeLanguage, t } from '../services/i18n.js';
import { notifyAdminUsers } from '../services/notificationService.js';

const sellerApprovalKeyboard = {
  inline_keyboard: [[{ text: 'Request Seller Approval', callback_data: 'seller_request_approval' }]],
};
const auctionTypes = ['standard', 'dutch', 'sealed_bid', 'reverse'];
const logBotError = (context, error) => {
  console.error(`[bot] ${context}`, {
    message: error?.message,
    response: error?.response?.body,
  });
};
const detectLanguage = (telegramLanguageCode = '') => {
  const code = String(telegramLanguageCode || '').toLowerCase();
  if (code.startsWith('sw')) return 'sw';
  if (code.startsWith('am')) return 'am';
  return 'en';
};
const userLanguage = (user, telegramLanguageCode = '') =>
  normalizeLanguage(user?.language || detectLanguage(telegramLanguageCode));

const getPostingBlockedMessage = (user) => {
  if (user.sellerApprovalStatus === 'pending') {
    return {
      text: 'Your seller account is pending approval. Please wait for review before posting auctions.',
      options: undefined,
    };
  }

  if (user.sellerApprovalStatus === 'rejected') {
    return {
      text: `Your previous seller approval request was rejected.${
        user.approvalRejectionReason ? `\nReason: ${user.approvalRejectionReason}` : ''
      }\nYou can request approval again below.`,
      options: { reply_markup: sellerApprovalKeyboard },
    };
  }

  return {
    text: 'Your seller account is not approved yet. Please request approval before posting auctions.',
    options: { reply_markup: sellerApprovalKeyboard },
  };
};

const parseBidInput = (text) => {
  const normalized = String(text || '').replace(/\s+/g, '');
  if (!normalized) {
    return { amount: Number.NaN, maxAutoBid: null };
  }

  const separator = normalized.includes('/') ? '/' : normalized.includes(':') ? ':' : null;
  if (!separator) {
    return { amount: Number(normalized), maxAutoBid: null };
  }

  const [amountValue, maxValue] = normalized.split(separator);
  return {
    amount: Number(amountValue),
    maxAutoBid: maxValue ? Number(maxValue) : null,
  };
};

const formatAuctionListItem = (auction, index) => {
  const priceLabel =
    auction.auctionType === 'sealed_bid'
      ? `Sealed Bids: ${auction.bidCount || 0}`
      : auction.auctionType === 'reverse'
        ? `Current Lowest Bid: ${auction.currentBid} ETB`
        : auction.auctionType === 'dutch'
          ? `Current Dutch Price: ${getCurrentDutchPrice(auction)} ETB`
          : `Current Bid: ${auction.currentBid} ETB`;

  return `${index + 1}. *${auction.itemName}*\n${priceLabel}\nCategory: ${auction.category || 'Uncategorized'}\nEnds: ${new Date(
    auction.endTime
  ).toLocaleString()}`;
};

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
        language: detectLanguage(msg.from.language_code),
      });
    } else {
      user.username = msg.from.username || '';
      user.firstName = msg.from.first_name || user.firstName;
      user.lastName = msg.from.last_name || user.lastName;
      user.language = userLanguage(user, msg.from.language_code);
      await user.save();
    }

    const locale = userLanguage(user, msg.from.language_code);

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

      const minimumBid = auction.currentBid + Math.max(Number(auction.bidIncrement) || 1, 1);
      stateManager.set(chatId, { step: 'awaiting_bid_amount', auctionId, userId: user._id });

      if (auction.auctionType === 'dutch') {
        return bot.sendMessage(
          chatId,
          t(locale, 'dutch_prompt', { item: auction.itemName, amount: String(getCurrentDutchPrice(auction)) }),
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: 'Accept Current Price', callback_data: `dutch_accept_${auction._id}` }]],
            },
          }
        );
      }

      if (auction.auctionType === 'sealed_bid') {
        return bot.sendMessage(
          chatId,
          t(locale, 'bid_prompt_sealed', { item: auction.itemName, amount: String(auction.startingPrice) }),
          {
            parse_mode: 'Markdown',
          }
        );
      }

      if (auction.auctionType === 'reverse') {
        return bot.sendMessage(
          chatId,
          t(locale, 'bid_prompt_reverse', {
            item: auction.itemName,
            amount: String(auction.currentBid),
            step: String(auction.bidIncrement || 1),
          }),
          { parse_mode: 'Markdown' }
        );
      }

      return bot.sendMessage(
        chatId,
        t(locale, 'bid_prompt', {
          item: auction.itemName,
          amount: String(auction.currentBid),
          hint: `Minimum Next Bid: ${minimumBid} ETB`,
        }),
        { parse_mode: 'Markdown' }
      );
    }

    if (payload && payload.startsWith('buy_')) {
      const auctionId = payload.split('_')[1];
      const auction = await Auction.findById(auctionId).populate('seller');

      if (!auction || auction.status !== 'active') {
        return bot.sendMessage(chatId, 'This auction is no longer available.');
      }

      if (!auction.buyNowPrice) {
        return bot.sendMessage(chatId, 'This auction does not have a Buy Now option.');
      }

      if (auction.seller._id.toString() === user._id.toString()) {
        return bot.sendMessage(chatId, 'You cannot buy your own auction.');
      }

      return bot.sendMessage(chatId, `Buy "${auction.itemName}" now for ${auction.buyNowPrice} ETB?`, {
        reply_markup: {
          inline_keyboard: [[{ text: 'Confirm Buy Now', callback_data: `buy_now_${auction._id}` }]],
        },
      });
    }

    if (!user.sellerApproved) {
      const approvalCopy =
        user.sellerApprovalStatus === 'pending'
          ? t(locale, 'start_pending')
          : user.sellerApprovalStatus === 'rejected'
            ? t(locale, 'start_rejected', {
                reason: user.approvalRejectionReason ? `\nReason: ${user.approvalRejectionReason}` : '',
              })
            : t(locale, 'start_request');

      return bot.sendMessage(
        chatId,
        t(locale, 'start_not_approved', {
          name: user.firstName || 'there',
          approvalCopy,
        }),
        {
          reply_markup: sellerApprovalKeyboard,
        }
      );
    }

    return bot.sendMessage(
      chatId,
      t(locale, 'start_approved', {
        name: user.firstName || 'there',
      }),
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/search(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const searchTerm = String(match?.[1] || '').trim();
    const user = await User.findOne({ telegramId: String(msg.from.id) });
    const locale = userLanguage(user, msg.from.language_code);

    if (!searchTerm) {
      return bot.sendMessage(chatId, t(locale, 'search_usage'));
    }

    const auctions = await searchActiveAuctions(searchTerm, 5);
    if (!auctions.length) {
      return bot.sendMessage(chatId, t(locale, 'search_empty', { term: searchTerm }));
    }

    const botProfile = await bot.getMe();
    return bot.sendMessage(
      chatId,
      `${t(locale, 'search_results')}\n\n${auctions.map(formatAuctionListItem).join('\n\n')}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: auctions.map((auction) => [
            { text: 'Watch Auction', callback_data: `watch_toggle_${auction._id}` },
            { text: 'Open Bid', url: `https://t.me/${botProfile.username}?start=bid_${auction._id}` },
          ]),
        },
      }
    );
  });

  bot.onText(/\/watchlist/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);

    try {
      const { user, items } = await listWatchedAuctionsForUser(telegramId);
      const locale = userLanguage(user, msg.from.language_code);

      if (!items.length) {
        return bot.sendMessage(chatId, t(locale, 'watchlist_empty'));
      }

      return bot.sendMessage(
        chatId,
        `${t(locale, 'watchlist_title')}\n\n${items.slice(0, 8).map(formatAuctionListItem).join('\n\n')}`,
        {
          parse_mode: 'Markdown',
        }
      );
    } catch (error) {
      return bot.sendMessage(chatId, error.message || 'Could not load your watchlist.');
    }
  });

  bot.onText(/\/language(?:\s+([a-z]{2}))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const user = await User.findOne({ telegramId });
    const requestedLanguage = normalizeLanguage(match?.[1]);

    if (!user) {
      return bot.sendMessage(chatId, 'Please use /start first.');
    }

    if (!match?.[1]) {
      return bot.sendMessage(
        chatId,
        `${t(user.language, 'language_prompt')}\n\n${t(user.language, 'language_usage')}`,
        {
          reply_markup: languageKeyboard,
        }
      );
    }

    user.language = requestedLanguage;
    await user.save();
    return bot.sendMessage(chatId, t(user.language, 'language_changed'));
  });

  bot.onText(/\/post/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from.id);
    const user = await User.findOne({ telegramId });
    const locale = userLanguage(user, msg.from.language_code);

    if (!user) {
      return bot.sendMessage(chatId, 'Please use /start to register first.');
    }

    if (user.banned) {
      return bot.sendMessage(
        chatId,
        `Your account is restricted from posting auctions.${user.banReason ? `\nReason: ${user.banReason}` : ''}`
      );
    }

    if (!user.sellerApproved) {
      const blocked = getPostingBlockedMessage(user);
      return bot.sendMessage(chatId, blocked.text, blocked.options);
    }

    stateManager.set(chatId, { step: 'post_name', userId: user._id, locale, mediaAssets: [] });
    return bot.sendMessage(chatId, "Let's post an item.\n\nPlease enter the *Item Name*:", {
      parse_mode: 'Markdown',
    });
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    try {
      const text = msg.text;
      const state = stateManager.get(chatId);

      if (text && text.startsWith('/')) return;
      if (!state) return;

      if (state.step === 'post_name') {
        stateManager.update(chatId, { step: 'post_description', itemName: text });
        return bot.sendMessage(chatId, 'Great. Now write a short *Description*:', { parse_mode: 'Markdown' });
      }

      if (state.step === 'post_description') {
        stateManager.update(chatId, { step: 'post_type', description: text });
        return bot.sendMessage(chatId, t(state.locale, 'post_type_prompt'));
      }

      if (state.step === 'post_type') {
        const auctionType = String(text || '')
          .trim()
          .toLowerCase();
        if (!auctionTypes.includes(auctionType)) {
          return bot.sendMessage(chatId, t(state.locale, 'post_type_invalid'));
        }

        stateManager.update(chatId, { step: 'post_price', auctionType });
        return bot.sendMessage(chatId, 'Enter the *Starting Price* in ETB (numbers only):', {
          parse_mode: 'Markdown',
        });
      }

      if (state.step === 'post_price') {
        const price = Number(text);
        if (Number.isNaN(price) || price <= 0) {
          return bot.sendMessage(chatId, 'Please enter a valid positive number for the starting price:');
        }

        if (state.auctionType === 'dutch') {
          stateManager.update(chatId, { step: 'post_dutch_floor', startingPrice: price, currentBid: price });
          return bot.sendMessage(chatId, t(state.locale, 'post_dutch_floor'));
        }

        if (state.auctionType === 'reverse') {
          stateManager.update(chatId, {
            step: 'post_increment',
            startingPrice: price,
            reservePrice: null,
            buyNowPrice: null,
          });
          return bot.sendMessage(chatId, 'Enter the minimum amount each new bid must go lower by:', {
            parse_mode: 'Markdown',
          });
        }

        stateManager.update(chatId, { step: 'post_reserve', startingPrice: price });
        return bot.sendMessage(chatId, "Enter a hidden reserve price, or type 'skip':", {
          parse_mode: 'Markdown',
        });
      }

      if (state.step === 'post_dutch_floor') {
        const floorPrice = Number(text);
        if (Number.isNaN(floorPrice) || floorPrice <= 0 || floorPrice >= state.startingPrice) {
          return bot.sendMessage(chatId, `Floor price must be lower than ${state.startingPrice} ETB.`);
        }

        stateManager.update(chatId, { step: 'post_dutch_drop', dutchFloorPrice: floorPrice });
        return bot.sendMessage(chatId, t(state.locale, 'post_dutch_drop'));
      }

      if (state.step === 'post_dutch_drop') {
        const dutchDropAmount = Number(text);
        if (Number.isNaN(dutchDropAmount) || dutchDropAmount <= 0) {
          return bot.sendMessage(chatId, 'Please enter a valid positive number for the Dutch drop amount.');
        }

        stateManager.update(chatId, { step: 'post_dutch_interval', dutchDropAmount });
        return bot.sendMessage(chatId, t(state.locale, 'post_dutch_interval'));
      }

      if (state.step === 'post_dutch_interval') {
        const dutchDropIntervalMinutes = Number(text);
        if (Number.isNaN(dutchDropIntervalMinutes) || dutchDropIntervalMinutes <= 0) {
          return bot.sendMessage(chatId, 'Please enter a valid positive number of minutes.');
        }

        stateManager.update(chatId, {
          step: 'post_duration',
          dutchDropIntervalMinutes,
          reservePrice: null,
          buyNowPrice: null,
          bidIncrement: 1,
        });
        return bot.sendMessage(chatId, 'Enter the *Duration* in hours (for example 24):', {
          parse_mode: 'Markdown',
        });
      }

      if (state.step === 'post_reserve') {
        if (text && text.toLowerCase() === 'skip') {
          stateManager.update(chatId, {
            step: state.auctionType === 'sealed_bid' ? 'post_duration' : 'post_buy_now',
            reservePrice: null,
            buyNowPrice: null,
            bidIncrement: state.auctionType === 'sealed_bid' ? 1 : state.bidIncrement,
          });
        } else {
          const reservePrice = Number(text);
          if (Number.isNaN(reservePrice) || reservePrice < state.startingPrice) {
            return bot.sendMessage(
              chatId,
              `Reserve price must be at least ${state.startingPrice} ETB, or type 'skip'.`
            );
          }

          stateManager.update(chatId, {
            step: state.auctionType === 'sealed_bid' ? 'post_duration' : 'post_buy_now',
            reservePrice,
            buyNowPrice: state.auctionType === 'sealed_bid' ? null : state.buyNowPrice,
            bidIncrement: state.auctionType === 'sealed_bid' ? 1 : state.bidIncrement,
          });
        }

        if (state.auctionType === 'sealed_bid') {
          return bot.sendMessage(chatId, 'Enter the *Duration* in hours (for example 24):', {
            parse_mode: 'Markdown',
          });
        }

        return bot.sendMessage(chatId, "Enter a Buy Now price, or type 'skip':", {
          parse_mode: 'Markdown',
        });
      }

      if (state.step === 'post_buy_now') {
        if (text && text.toLowerCase() === 'skip') {
          stateManager.update(chatId, { step: 'post_increment', buyNowPrice: null });
        } else {
          const buyNowPrice = Number(text);
          if (Number.isNaN(buyNowPrice) || buyNowPrice <= state.startingPrice) {
            return bot.sendMessage(chatId, `Buy Now must be higher than ${state.startingPrice} ETB, or type 'skip'.`);
          }

          if (state.reservePrice && buyNowPrice < state.reservePrice) {
            return bot.sendMessage(chatId, 'Buy Now must be equal to or higher than the reserve price, or type skip.');
          }

          stateManager.update(chatId, { step: 'post_increment', buyNowPrice });
        }

        return bot.sendMessage(chatId, "Enter the minimum bid increment, or type 'skip' to use 1 ETB:", {
          parse_mode: 'Markdown',
        });
      }

      if (state.step === 'post_increment') {
        if (text && text.toLowerCase() === 'skip') {
          stateManager.update(chatId, { step: 'post_duration', bidIncrement: 1 });
        } else {
          const bidIncrement = Number(text);
          if (Number.isNaN(bidIncrement) || bidIncrement <= 0) {
            return bot.sendMessage(
              chatId,
              "Please enter a valid positive number for the bid increment, or type 'skip'."
            );
          }

          stateManager.update(chatId, { step: 'post_duration', bidIncrement });
        }

        return bot.sendMessage(chatId, 'Enter the *Duration* in hours (for example 24):', {
          parse_mode: 'Markdown',
        });
      }

      if (state.step === 'post_duration') {
        const duration = Number(text);
        if (Number.isNaN(duration) || duration <= 0) {
          return bot.sendMessage(chatId, 'Please enter a valid positive number for hours:');
        }

        stateManager.update(chatId, { step: 'post_category', duration });
        return bot.sendMessage(chatId, "Enter a category, or type 'skip':", {
          parse_mode: 'Markdown',
        });
      }

      if (state.step === 'post_category') {
        stateManager.update(chatId, {
          step: 'post_tags',
          category: text && text.toLowerCase() !== 'skip' ? text.trim() : '',
        });
        return bot.sendMessage(chatId, "Enter comma-separated tags, or type 'skip':", {
          parse_mode: 'Markdown',
        });
      }

      if (state.step === 'post_tags') {
        const tags =
          text && text.toLowerCase() !== 'skip'
            ? text
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
            : [];

        stateManager.update(chatId, { step: 'post_media', tags });
        return bot.sendMessage(chatId, t(state.locale, 'media_prompt'), { parse_mode: 'Markdown' });
      }

      if (state.step === 'post_media') {
        let imageUrl = null;
        let videoUrl = null;
        const currentAssets = Array.isArray(state.mediaAssets) ? state.mediaAssets : [];

        if (text && text.toLowerCase() === 'done') {
          if (!currentAssets.length) {
            return bot.sendMessage(chatId, 'You have not added any media yet. Send a file or type skip.');
          }
        } else if (msg.photo && msg.photo.length > 0) {
          imageUrl = msg.photo[msg.photo.length - 1].file_id;
        } else if (msg.video) {
          videoUrl = msg.video.file_id;
        } else if (text && text.toLowerCase() !== 'skip') {
          return bot.sendMessage(chatId, t(state.locale, 'media_invalid'));
        }

        if (imageUrl || videoUrl) {
          const mediaAssets = [
            ...currentAssets,
            {
              kind: imageUrl ? 'photo' : 'video',
              fileId: imageUrl || videoUrl,
              caption: msg.caption || '',
            },
          ];

          stateManager.update(chatId, {
            mediaAssets,
            imageUrl: state.imageUrl || imageUrl,
            videoUrl: state.videoUrl || videoUrl,
          });
          return bot.sendMessage(chatId, t(state.locale, 'media_added'));
        }

        const endTime = new Date(Date.now() + state.duration * 60 * 60 * 1000);

        const newAuction = await Auction.create({
          itemName: state.itemName,
          description: state.description,
          auctionType: state.auctionType,
          startingPrice: state.startingPrice,
          reservePrice: state.reservePrice,
          buyNowPrice: state.buyNowPrice,
          dutchFloorPrice: state.dutchFloorPrice,
          dutchDropAmount: state.dutchDropAmount,
          dutchDropIntervalMinutes: state.dutchDropIntervalMinutes,
          bidIncrement: state.bidIncrement,
          category: state.category,
          tags: state.tags,
          seller: state.userId,
          durationHours: state.duration,
          endTime,
          currentBid: state.auctionType === 'dutch' ? state.startingPrice : state.startingPrice,
          imageUrl: state.imageUrl || null,
          videoUrl: state.videoUrl || null,
          mediaAssets: currentAssets,
        });

        await bot.sendMessage(
          chatId,
          'Your auction has been submitted for admin review. We will notify you once it is approved or rejected.'
        );

        const seller = await User.findById(state.userId);
        await notifyAdminUsers(
          `Pending auction review\n\nItem: ${newAuction.itemName}\nSeller: ${
            seller?.username ? `@${seller.username}` : seller?.firstName || seller?.telegramId || 'Unknown seller'
          }\nStarting Price: ${newAuction.startingPrice} ETB`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Approve', callback_data: `auction_approve_${newAuction._id}` },
                  { text: 'Reject', callback_data: `auction_reject_${newAuction._id}` },
                ],
              ],
            },
          }
        );

        stateManager.delete(chatId);
        return;
      }

      if (state.step === 'awaiting_bid_amount') {
        const { amount, maxAutoBid } = parseBidInput(text);
        const bidder = await User.findById(state.userId);
        const locale = userLanguage(bidder);

        if (
          Number.isNaN(amount) ||
          amount <= 0 ||
          (maxAutoBid !== null && (Number.isNaN(maxAutoBid) || maxAutoBid <= 0))
        ) {
          return bot.sendMessage(chatId, t(locale, 'bid_invalid'));
        }

        if (!bidder) {
          stateManager.delete(chatId);
          return bot.sendMessage(chatId, 'Your account could not be found. Please use /start again.');
        }

        if (bidder.banned) {
          stateManager.delete(chatId);
          return bot.sendMessage(
            chatId,
            `Your account is restricted from bidding.${bidder?.banReason ? `\nReason: ${bidder.banReason}` : ''}`
          );
        }

        try {
          const result = await placeBidForAuction(state.auctionId, bidder, { amount, maxAutoBid });
          const isSealedBid = result.auction?.auctionType === 'sealed_bid';

          await bot.sendMessage(
            chatId,
            isSealedBid
              ? t(locale, 'bid_received_sealed', {
                  amount: String(amount),
                  extended: result.extended ? t(locale, 'bid_extended') : '',
                })
              : maxAutoBid !== null
                ? t(locale, 'bid_received_auto', {
                    amount: String(amount),
                    max: String(maxAutoBid),
                    current: String(result.auction.currentBid),
                    extended: result.extended ? t(locale, 'bid_extended') : '',
                  })
                : t(locale, 'bid_received', {
                    amount: String(amount),
                    current: String(result.auction.currentBid),
                    extended: result.extended ? t(locale, 'bid_extended') : '',
                  })
          );
          stateManager.delete(chatId);
        } catch (error) {
          return bot.sendMessage(chatId, error.message || 'Could not place your bid.');
        }
      }
    } catch (error) {
      logBotError('Unhandled message handler error', error);
      return bot.sendMessage(chatId, 'Something went wrong while processing your request. Please try again.');
    }
  });
};
