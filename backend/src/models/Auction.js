import mongoose from 'mongoose';

const auctionMediaSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['photo', 'video'],
      required: true,
    },
    fileId: {
      type: String,
      default: '',
    },
    sourceUrl: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

auctionMediaSchema.path('fileId').validate(function validateMediaSource(value) {
  return Boolean(value || this.sourceUrl);
}, 'Media asset requires a fileId or sourceUrl.');

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
    descriptionFormat: {
      type: String,
      enum: ['plain', 'markdown', 'html'],
      default: 'plain',
    },
    startingPrice: {
      type: Number,
      required: true,
    },
    reservePrice: {
      type: Number,
      default: null,
    },
    buyNowPrice: {
      type: Number,
      default: null,
    },
    dutchFloorPrice: {
      type: Number,
      default: null,
    },
    dutchDropAmount: {
      type: Number,
      default: null,
    },
    dutchDropIntervalMinutes: {
      type: Number,
      default: null,
    },
    bidIncrement: {
      type: Number,
      default: 1,
      min: 1,
    },
    currentBid: {
      type: Number,
      default: function () {
        return this.startingPrice;
      },
    },
    bidCount: {
      type: Number,
      default: 0,
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
    videoUrl: {
      type: String,
      default: null,
    },
    mediaAssets: {
      type: [auctionMediaSchema],
      default: [],
    },
    category: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    auctionType: {
      type: String,
      enum: ['standard', 'dutch', 'sealed_bid', 'reverse'],
      default: 'standard',
    },
    channelMessageId: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'ended', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ status: 1, createdAt: -1 });
auctionSchema.index({ seller: 1, createdAt: -1 });
auctionSchema.index({ highestBidder: 1 });
auctionSchema.index({ auctionType: 1, status: 1 });

const Auction = mongoose.model('Auction', auctionSchema);

export default Auction;
