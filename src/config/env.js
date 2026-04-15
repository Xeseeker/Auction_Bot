import dotenv from 'dotenv';
dotenv.config();

export const config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telegram_auction',
  CHANNEL_ID: process.env.CHANNEL_ID,
  PORT: process.env.PORT || 3000,
};

if (!config.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing in the environment variables.');
  process.exit(1);
}

if (!config.CHANNEL_ID) {
  console.error('❌ CHANNEL_ID is missing in the environment variables. The bot needs a channel to post auctions.');
  // Optional: We can still run without it, but it's required for the core flow.
}
