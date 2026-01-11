import express from 'express';
import * as controller from '../controllers/product.controllers.js';
// import { upload } from '../middlewares/upload.middleware.js';
import { productValidation } from '../middlewares/productValidator.middleware.js';
import { requireAuth, isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// --- PUBLIC ROUTES (SEO Friendly) ---

router.get('/', controller.getAllProducts);

router.get('/details/:slug', controller.getProductBySlug);

router.get('/related/:categoryId', controller.getRelatedProducts);

router.get('/search', controller.searchProducts);

// --- ADMIN PROTECTED ROUTES ---
router.post(
  '/',
  requireAuth,
  isAdmin,
  // upload.array('images', 5),
  productValidation,
  controller.createProduct
);

router.patch(
  '/:id',
  requireAuth,
  isAdmin,
  // upload.array('images', 5),
  controller.updateProduct
);

router.patch('/status/:id', requireAuth, isAdmin, controller.updateProductStatus);

router.delete('/:id', requireAuth, isAdmin, controller.deleteProduct);

export default router;
