import cron from 'node-cron';
import Auction from '../models/Auction.js';
import { endAuction, hydrateAuctionDynamicState, updateChannelAuctionPost } from './auctionService.js';
import { emitPlatformUpdate } from './liveUpdateService.js';

export const startCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const activeDutchAuctions = await Auction.find({
        status: 'active',
        auctionType: 'dutch',
      });

      for (const auction of activeDutchAuctions) {
        const previousPrice = auction.currentBid;
        await hydrateAuctionDynamicState(auction, { persist: true });

        if (previousPrice !== auction.currentBid) {
          await updateChannelAuctionPost(auction._id);
          emitPlatformUpdate('auctions:update', {
            type: 'auction:dutch-price-changed',
            auctionId: String(auction._id),
            currentBid: auction.currentBid,
          });
        }
      }

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
