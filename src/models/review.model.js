import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Comment cannot be empty'],
    },
    images: [
      {
        url: String,
        fileId: String,
      },
    ],
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Approved',
    },
  },
  { timestamps: true }
);

// একই ইউজার যেন একই প্রোডাক্টে বারবার রিভিউ দিতে না পারে (Unique Index)
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const reviewModel = mongoose.model('Review', reviewSchema);
export default reviewModel;
