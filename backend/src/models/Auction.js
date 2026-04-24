import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    startingPrice: {
      type: Number,
      required: true,
    },
    currentBid: {
      type: Number,
      default: function () {
        return this.startingPrice;
      },
    },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    durationHours: {
      type: Number,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null, // You can store telegram file IDs here
    },
    channelMessageId: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'ended', 'cancelled'],
      default: 'active', // For V1, defaulting to active directly
    },
  },
  { timestamps: true }
);

const Auction = mongoose.model('Auction', auctionSchema);

export default Auction;
