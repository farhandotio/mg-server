import express from 'express';
import { payWithBkash, bkashCallback } from '../controllers/bkash.controllers.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/create/:orderId', requireAuth, payWithBkash);
router.get('/callback', bkashCallback);

export default router;
