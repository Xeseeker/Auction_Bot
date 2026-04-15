import express from 'express';
import { config } from './src/config/env.js';
import connectDB from './src/config/db.js';
import { startCronJobs } from './src/services/cronService.js';
import { startBot } from './src/bot/index.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Auction Bot is Running.');
});

// Initialize Application Systems
const init = async () => {
  try {
    // 1️⃣ Connect to MongoDB
    await connectDB();

    // 2️⃣ Start Telegram Bot Handlers
    startBot();

    // 3️⃣ Start Cron Jobs for Auction Expiration
    startCronJobs();

    // 4️⃣ Start Express Server (Optional: useful for health checks or future webhooks)
    app.listen(config.PORT, () => {
      console.log(`🌐 Application running on port ${config.PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize the application:', error);
    process.exit(1);
  }
};

init();
