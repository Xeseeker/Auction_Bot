import bot from './instance.js';
import { config } from '../config/env.js';

export const setupCallbacks = () => {
  if (!bot) return;

  bot.on('callback_query', async (query) => {
    // const chatId = query.message.chat.id;
    // const data = query.data;

    // We can add inline callback handlers here like approving/rejecting items.

    bot.answerCallbackQuery(query.id);
  });
};
