import express from 'express';
import * as controller from '../controllers/cart.controllers.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';
import * as valid from '../middlewares/cartValidator.middleware.js';

const router = express.Router();

// ১. গেট কার্ট
router.get('/', optionalAuth, valid.getCartValidation, controller.getCart);

// ২. অ্যাড টু কার্ট (নতুন আইটেম যোগ করার জন্য)
router.post('/add', optionalAuth, valid.addToCartValidation, controller.addToCart);

// ৩. আপডেট কার্ট (প্লাস/মাইনাস বাটনের জন্য কোয়ান্টিটি বাড়ানো বা কমানো)
router.post('/update', optionalAuth, controller.updateCartQuantity);

// ৪. রিমুভ ফ্রম কার্ট
router.post('/remove', optionalAuth, valid.removeFromCartValidation, controller.removeFromCart);

// ৫. মার্জ কার্ট
router.post('/merge', requireAuth, valid.mergeCartValidation, controller.mergeCart);

export default router;
