import express from 'express';
import * as controller from '../controllers/category.controllers.js';
// import { upload } from '../middlewares/upload.middleware.js';
import { requireAuth, isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public: সবাই ক্যাটাগরি দেখতে পারবে
router.get('/', controller.getAllCategories);

// Admin Only: শুধু অ্যাডমিন ক্যাটাগরি ম্যানেজ করবে
router.post('/', requireAuth,
  isAdmin,
  // upload.single('image'),
  controller.createCategory);
router.patch('/:id', requireAuth, isAdmin,
  // upload.single('image'),
  controller.updateCategory);
router.delete('/:id', requireAuth, isAdmin, controller.deleteCategory);

export default router;
