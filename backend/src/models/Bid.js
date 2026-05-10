import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    maxAutoBid: {
      type: Number,
      default: null,
    },
    isAutoBid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

bidSchema.index({ auction: 1, createdAt: -1 });
bidSchema.index({ bidder: 1, createdAt: -1 });
bidSchema.index({ auction: 1, bidder: 1 });

const Bid = mongoose.model('Bid', bidSchema);

export default Bid;
