import express from 'express';
import * as controller from '../controllers/review.controllers.js';
import { requireAuth, isAdmin } from '../middlewares/auth.middleware.js';
import { createReviewValidation } from '../middlewares/reviewValidator.middleware.js';

const router = express.Router();

/** -----------------------------------------------------------
 * PUBLIC ROUTES
 * ----------------------------------------------------------- */

// ১. কোনো নির্দিষ্ট প্রোডাক্টের সব 'Approved' রিভিউ দেখা
router.get('/product/:productId', controller.getProductReviews);

// ২. প্রোডাকশন টিপ: রিভিউ এর সামারি দেখা (যেমন: ৫ স্টার কয়টি, ৪ স্টার কয়টি)
router.get('/stats/:productId', controller.getReviewStats);

/** -----------------------------------------------------------
 * USER ROUTES (Required Authentication)
 * ----------------------------------------------------------- */

// ৩. নতুন রিভিউ যোগ করা (Validation সহ)
router.post('/add', requireAuth, createReviewValidation, controller.addReview);

// ৪. নিজের দেওয়া রিভিউ এডিট করা
router.patch('/update/:id', requireAuth, controller.updateReview);

// ৫. নিজের রিভিউ ডিলিট করা
router.delete('/:id', requireAuth, controller.deleteReview);

// ৬. হেল্পফুল ভোট (Helpful/Unhelpful) - প্রোডাকশন ফিচার
router.patch('/vote/:id', requireAuth, controller.toggleHelpful);

/** -----------------------------------------------------------
 * ADMIN ROUTES (Required Admin Privilege)
 * ----------------------------------------------------------- */

// ৭. অ্যাডমিন সব রিভিউ দেখবে (Pending/Approved/Rejected ফিল্টার সহ)
router.get('/admin/all', requireAuth, isAdmin, controller.getAllReviewsAdmin);

// ৮. রিভিউর স্ট্যাটাস পরিবর্তন করা (Moderation)
router.patch('/admin/status/:id', requireAuth, isAdmin, controller.updateReviewStatus);

export default router;
