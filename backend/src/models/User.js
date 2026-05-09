import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      default: '',
    },
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      enum: ['en', 'sw', 'am'],
      default: 'en',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    banned: {
      type: Boolean,
      default: false,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    banReason: {
      type: String,
      default: '',
    },
    sellerApproved: {
      type: Boolean,
      default: false,
    },
    sellerApprovalStatus: {
      type: String,
      enum: ['not_requested', 'pending', 'approved', 'rejected'],
      default: 'not_requested',
    },
    approvalRequestedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: String,
      default: '',
    },
    approvalReviewedAt: {
      type: Date,
      default: null,
    },
    approvalRejectionReason: {
      type: String,
      default: '',
    },
    watchlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auction',
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
