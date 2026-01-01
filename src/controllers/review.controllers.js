import reviewModel from '../models/review.model.js';
import orderModel from '../models/order.model.js';
import mongoose from 'mongoose';

/** -----------------------------------------------------------
 * USER CONTROLLERS
 * ----------------------------------------------------------- */

// ১. Add Review (Verified Purchase Logic)
export const addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id;

    const hasOrdered = await orderModel.findOne({
      user: userId,
      'orderItems.product': productId,
      orderStatus: 'Delivered',
    });

    if (!hasOrdered) {
      return res
        .status(403)
        .json({ success: false, message: 'Purchase the product to leave a review.' });
    }

    const alreadyReviewed = await reviewModel.findOne({ productId, userId });
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: 'You already reviewed this product' });
    }

    const review = await reviewModel.create({
      productId,
      userId,
      rating: Number(rating),
      comment,
      isVerifiedPurchase: true,
      status: 'Approved', // প্রোডাকশনে 'Pending' রাখতে পারেন মডারেশনের জন্য
    });

    res.status(201).json({ success: true, message: 'Review submitted!', review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ২. Update Review (User can edit their own review)
export const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await reviewModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { rating, comment, status: 'Approved' },
      { new: true, runValidators: true }
    );

    if (!review) return res.status(404).json({ message: 'Review not found or unauthorized' });
    res.json({ success: true, message: 'Review updated!', review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ৩. Toggle Helpful Vote
export const toggleHelpful = async (req, res) => {
  try {
    const review = await reviewModel.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // লাইক লজিক (একবার ক্লিক করলে বাড়বে, আবার করলে কমবে)
    const isHelpful = review.helpfulVotes.includes(req.user._id);
    if (isHelpful) {
      review.helpfulVotes.pull(req.user._id);
    } else {
      review.helpfulVotes.push(req.user._id);
    }

    await review.save();
    res.json({ success: true, helpfulCount: review.helpfulVotes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** -----------------------------------------------------------
 * PUBLIC CONTROLLERS
 * ----------------------------------------------------------- */

// ৪. Get Product Reviews (With Pagination)
export const getProductReviews = async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const reviews = await reviewModel
      .find({ productId: req.params.productId, status: 'Approved' })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await reviewModel.countDocuments({
      productId: req.params.productId,
      status: 'Approved',
    });

    res.json({ success: true, total, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ৫. Get Review Stats (Rating Summary)
export const getReviewStats = async (req, res) => {
  try {
    const stats = await reviewModel.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(req.params.productId),
          status: 'Approved',
        },
      },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** -----------------------------------------------------------
 * ADMIN CONTROLLERS
 * ----------------------------------------------------------- */

// ৬. Get All Reviews (Admin Management)
export const getAllReviewsAdmin = async (req, res) => {
  try {
    const reviews = await reviewModel
      .find()
      .populate('productId', 'title')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ৭. Update Review Status (Moderate)
export const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body; // Approved or Rejected
    const review = await reviewModel.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, message: `Review ${status}`, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ৮. Delete Review
export const deleteReview = async (req, res) => {
  try {
    const review = await reviewModel.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await reviewModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
