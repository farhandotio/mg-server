import express from 'express';
import * as controller from '../controllers/brand.controllers.js';
import { brandValidation } from '../middlewares/brandValidator.middleware.js';
// import { upload } from '../middlewares/upload.middleware.js';
import { requireAuth, isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', controller.getAllBrands);

// Admin Only
router.post(
  '/',
  requireAuth,
  isAdmin,
  // upload.single('image'),
  brandValidation,
  controller.createBrand
);
router.patch('/:id', requireAuth, isAdmin,
  // upload.single('image'),
  controller.updateBrand);
router.delete('/:id', requireAuth, isAdmin, controller.deleteBrand);

export default router;
