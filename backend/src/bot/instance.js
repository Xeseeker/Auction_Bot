import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/env.js';

let bot;

if (config.BOT_TOKEN) {
  bot = new TelegramBot(config.BOT_TOKEN, { polling: true });
} else {
  console.warn('⚠️ Bot token is not set, running without telegram bot instance.');
}

export default bot;
