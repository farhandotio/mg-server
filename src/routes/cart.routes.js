import express from 'express';
import * as controller from '../controllers/cart.controllers.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware.js';
import * as valid from '../middlewares/cartValidator.middleware.js';

const router = express.Router();

// ১. গেট কার্ট (Query validation)
router.get('/', optionalAuth, valid.getCartValidation, controller.getCart);

// ২. অ্যাড টু কার্ট
router.post('/add', optionalAuth, valid.addToCartValidation, controller.addToCart);

// ৩. রিমুভ ফ্রম কার্ট
router.post('/remove', optionalAuth, valid.removeFromCartValidation, controller.removeFromCart);

// ৪. মার্জ কার্ট (অবশ্যই লগইন করা থাকতে হবে)
router.post('/merge', requireAuth, valid.mergeCartValidation, controller.mergeCart);

export default router;
