import cron from 'node-cron';
import Auction from '../models/Auction.js';
import { endAuction } from './auctionService.js';

export const startCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find active auctions where endTime is passed
      const expiredAuctions = await Auction.find({
        status: 'active',
        endTime: { $lte: now }
      });

      if (expiredAuctions.length > 0) {
        console.log(`⏱️ Cron Job: Found ${expiredAuctions.length} expired auctions. Processing...`);
        for (const auction of expiredAuctions) {
          await endAuction(auction);
        }
      }
    } catch (error) {
      console.error('❌ Error in Cron Job checking for expired auctions:', error);
    }
  });
  
  console.log('✅ Cron Jobs scheduled.');
};
