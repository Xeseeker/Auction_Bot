import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: [path.resolve(__dirname, '../../.env'), path.resolve(__dirname, '../../../.env')],
});

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  BOT_TOKEN: process.env.BOT_TOKEN,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telegram_auction',
  CHANNEL_ID: process.env.CHANNEL_ID,
  PORT: process.env.PORT || 3001,
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-me-before-production',
  SESSION_TTL_HOURS: Number(process.env.SESSION_TTL_HOURS || 12),
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  ADMIN_CORS_ORIGIN: process.env.ADMIN_CORS_ORIGIN || '',
  ADMIN_PANEL_TITLE: process.env.ADMIN_PANEL_TITLE || 'Telegram Auction Admin',
};

if (!config.BOT_TOKEN) {
  console.error('BOT_TOKEN is missing in the environment variables.');
  process.exit(1);
}

if (!config.CHANNEL_ID) {
  console.error('CHANNEL_ID is missing in the environment variables. The bot needs a channel to post auctions.');
}

if (!config.ADMIN_USERNAME || !config.ADMIN_PASSWORD) {
  console.warn(
    'Admin panel credentials are not fully configured. Set ADMIN_USERNAME and ADMIN_PASSWORD to enable web logins.'
  );
}
