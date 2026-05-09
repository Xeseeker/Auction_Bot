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

const Bid = mongoose.model('Bid', bidSchema);

export default Bid;
