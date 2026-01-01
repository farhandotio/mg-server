import express from 'express';
import * as controller from '../controllers/product.controllers.js';
import { upload } from '../middlewares/upload.middleware.js';
import { productValidation } from '../middlewares/productValidator.middleware.js';
import { requireAuth, isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// --- PUBLIC ROUTES (SEO Friendly) ---

// ১. সব প্রোডাক্ট দেখা (Pagination, Filtering, Sorting সহ)
router.get('/', controller.getAllProducts);

// ২. একটি নির্দিষ্ট প্রোডাক্ট দেখা (SEO slug দিয়ে)
router.get('/details/:slug', controller.getProductBySlug);

// ৩. রিলেটেড প্রোডাক্ট (একই ক্যাটাগরির অন্য প্রোডাক্ট দেখানোর জন্য)
router.get('/related/:categoryId', controller.getRelatedProducts);

// ৪. সার্চ এবং অ্যাডভান্স ফিল্টার (ব্র্যান্ড, প্রাইজ রেঞ্জ অনুযায়ী)
router.get('/search', controller.searchProducts);

// --- ADMIN PROTECTED ROUTES ---

// ৫. প্রোডাক্ট তৈরি করা
router.post(
  '/',
  requireAuth,
  // isAdmin,
  upload.array('images', 5),
  productValidation,
  controller.createProduct
);

// ৬. প্রোডাক্ট আপডেট করা (পুরো ডাটা বা ইমেজসহ)
router.patch(
  '/:id',
  requireAuth,
  isAdmin,
  upload.array('images', 5),
  controller.updateProduct
);

// ৭. শুধুমাত্র স্ট্যাটাস পরিবর্তন (Published/Draft/OutOfStock) - SEO-তে প্রভাব ফেলে
router.patch('/status/:id', requireAuth, isAdmin, controller.updateProductStatus);

// ৮. প্রোডাক্ট ডিলিট করা
router.delete('/:id', requireAuth, isAdmin, controller.deleteProduct);

export default router;
