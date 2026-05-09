import bot from '../bot/instance.js';
import User from '../models/User.js';

export const sendBotMessage = async (chatId, text, options = {}) => {
  if (!bot || !chatId) {
    return false;
  }

  try {
    await bot.sendMessage(chatId, text, options);
    return true;
  } catch (error) {
    console.error(`Failed to notify chat ${chatId}:`, error);
    return false;
  }
};

export const notifyAdminUsers = async (text, options = {}) => {
  if (!bot) {
    return 0;
  }

  const admins = await User.find({
    role: 'admin',
    banned: false,
    telegramId: { $exists: true, $ne: '' },
  }).select('telegramId');

  if (!admins.length) {
    return 0;
  }

  const results = await Promise.allSettled(admins.map((admin) => bot.sendMessage(admin.telegramId, text, options)));
  return results.filter((result) => result.status === 'fulfilled').length;
};
