import bot from './instance.js';
import stateManager from './stateManager.js';
import User from '../models/User.js';
import { requestSellerApproval, updateSellerApprovalStatus } from '../services/adminService.js';
import {
  approveAuctionByAdmin,
  buyNowAuction,
  rejectAuctionByAdmin,
  toggleAuctionWatchlist,
  acceptDutchAuctionPrice,
} from '../services/auctionService.js';
import { normalizeLanguage, t } from '../services/i18n.js';
import { notifyAdminUsers } from '../services/notificationService.js';

const getAdminActor = async (telegramId) =>
  User.findOne({
    telegramId: String(telegramId),
    role: 'admin',
    banned: false,
  });

export const setupCallbacks = () => {
  if (!bot) return;

  bot.on('callback_query', async (query) => {
    const data = query.data || '';
    const telegramId = String(query.from.id);

    try {
      if (data === 'seller_request_approval') {
        const { user, state } = await requestSellerApproval(telegramId);

        if (state === 'approved') {
          return bot.answerCallbackQuery(query.id, {
            text: 'Your seller account is already approved.',
          });
        }

        if (state === 'pending') {
          return bot.answerCallbackQuery(query.id, {
            text: 'Your approval request is already pending.',
          });
        }

        await notifyAdminUsers(
          `Seller approval requested\n\nUser: ${
            user.username
              ? `@${user.username}`
              : [user.firstName, user.lastName].filter(Boolean).join(' ') || user.telegramId
          }\nTelegram ID: ${user.telegramId}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Approve Seller', callback_data: `seller_approve_${user._id}` },
                  { text: 'Reject Seller', callback_data: `seller_reject_${user._id}` },
                ],
              ],
            },
          }
        );

        if (query.message?.chat?.id) {
          await bot.sendMessage(query.message.chat.id, 'Your seller approval request has been submitted.');
        }

        return bot.answerCallbackQuery(query.id, {
          text: 'Approval request submitted.',
        });
      }

      if (data.startsWith('seller_approve_') || data.startsWith('seller_reject_')) {
        const adminActor = await getAdminActor(telegramId);
        if (!adminActor) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Admin access required.',
            show_alert: true,
          });
        }

        const approved = data.startsWith('seller_approve_');
        const userId = data.split('_').pop();
        await updateSellerApprovalStatus(userId, {
          approved,
          adminLabel: adminActor.username || adminActor.firstName || 'Bot Admin',
        });

        if (query.message?.chat?.id && query.message?.message_id) {
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
            }
          );
        }

        return bot.answerCallbackQuery(query.id, {
          text: approved ? 'Seller approved.' : 'Seller rejected.',
        });
      }

      if (data.startsWith('auction_approve_') || data.startsWith('auction_reject_')) {
        const adminActor = await getAdminActor(telegramId);
        if (!adminActor) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Admin access required.',
            show_alert: true,
          });
        }

        const approved = data.startsWith('auction_approve_');
        const auctionId = data.split('_').pop();

        if (approved) {
          await approveAuctionByAdmin(auctionId, {
            adminLabel: adminActor.username || adminActor.firstName || 'Bot Admin',
          });
        } else {
          await rejectAuctionByAdmin(auctionId, {
            adminLabel: adminActor.username || adminActor.firstName || 'Bot Admin',
          });
        }

        if (query.message?.chat?.id && query.message?.message_id) {
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
            }
          );
        }

        return bot.answerCallbackQuery(query.id, {
          text: approved ? 'Auction approved.' : 'Auction rejected.',
        });
      }

      if (data.startsWith('watch_toggle_')) {
        const user = await User.findOne({ telegramId });
        if (!user) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Please use /start first.',
            show_alert: true,
          });
        }

        if (user.banned) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Your account is restricted.',
            show_alert: true,
          });
        }

        const auctionId = data.split('_').pop();
        const result = await toggleAuctionWatchlist(auctionId, telegramId);

        return bot.answerCallbackQuery(query.id, {
          text: result.watching
            ? t(user.language, 'watch_added', { item: result.auction.itemName })
            : t(user.language, 'watch_removed', { item: result.auction.itemName }),
        });
      }

      if (data.startsWith('lang_')) {
        const user = await User.findOne({ telegramId });
        if (!user) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Please use /start first.',
            show_alert: true,
          });
        }

        user.language = normalizeLanguage(data.split('_').pop());
        await user.save();

        if (query.message?.chat?.id) {
          await bot.sendMessage(query.message.chat.id, t(user.language, 'language_changed'));
        }

        return bot.answerCallbackQuery(query.id, {
          text: t(user.language, 'language_changed'),
        });
      }

      if (data.startsWith('dutch_accept_')) {
        const user = await User.findOne({ telegramId });
        if (!user) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Please start the bot first.',
            show_alert: true,
          });
        }

        if (user.banned) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Your account is restricted.',
            show_alert: true,
          });
        }

        const auctionId = data.split('_').pop();
        const auction = await acceptDutchAuctionPrice(auctionId, user);

        if (query.message?.chat?.id) {
          stateManager.delete(query.message.chat.id);
          await bot.sendMessage(
            query.message.chat.id,
            `You accepted the current Dutch auction price for "${auction.itemName}" at ${auction.currentBid} ETB.`
          );
        }

        return bot.answerCallbackQuery(query.id, {
          text: 'Dutch auction purchase completed.',
        });
      }

      if (data.startsWith('buy_now_')) {
        const user = await User.findOne({ telegramId });
        if (!user) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Please start the bot first.',
            show_alert: true,
          });
        }

        if (user.banned) {
          return bot.answerCallbackQuery(query.id, {
            text: 'Your account is restricted.',
            show_alert: true,
          });
        }

        const auctionId = data.split('_').pop();
        const auction = await buyNowAuction(auctionId, user);

        if (query.message?.chat?.id) {
          await bot.sendMessage(
            query.message.chat.id,
            `You bought "${auction.itemName}" for ${auction.buyNowPrice} ETB. The seller has been notified.`
          );
        }

        return bot.answerCallbackQuery(query.id, {
          text: 'Purchase completed.',
        });
      }

      return bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error('Callback handling failed:', error);
      return bot.answerCallbackQuery(query.id, {
        text: error.message || 'Action failed.',
        show_alert: true,
      });
    }
  });
};
