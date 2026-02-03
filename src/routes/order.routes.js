import express from 'express';
import * as controller from '../controllers/order.controllers.js';
import { requireAuth, isAdmin } from '../middlewares/auth.middleware.js';
import { createOrderValidation } from '../middlewares/orderValidator.middleware.js';

const router = express.Router();

// --- User Routes ---

// ১. চেকআউট শেষ করে অর্ডার তৈরি করা (এটিই মূল Checkout endpoint)
router.post('/create', requireAuth, createOrderValidation, controller.createOrder);

router.post('/create-single', requireAuth, controller.createSingleOrder);

// ২. ইউজারের নিজের সব অর্ডার লিস্ট দেখা
router.get('/my-orders', requireAuth, controller.myOrders);

// ৩. একটি নির্দিষ্ট অর্ডারের বিস্তারিত দেখা (Invoice বা ট্র্যাকিংয়ের জন্য)
router.get('/:id', requireAuth, controller.getOrderDetails);

// ৪. ইউজার চাইলে অর্ডার ক্যানসেল করা (যদি 'Processing' অবস্থায় থাকে)
router.patch('/cancel/:id', requireAuth, controller.cancelOrder);

// --- Admin Routes (Management) ---

// ৫. অ্যাডমিন সব অর্ডার দেখবে (Filter সহ)
router.get('/admin/all', requireAuth, isAdmin, controller.getAllOrdersAdmin);

// ৬. অর্ডারের স্ট্যাটাস আপডেট করা (Processing -> Shipped -> Delivered)
router.patch('/admin/status/:id', requireAuth, isAdmin, controller.updateOrderStatus);

// ৭. পেমেন্ট স্ট্যাটাস ম্যানুয়ালি আপডেট করা (যদি ক্যাশ অন ডেলিভারি হয়)
router.patch('/admin/payment-status/:id', requireAuth, isAdmin, controller.updatePaymentStatus);

// ৮. অ্যাডমিন অর্ডার ডিলিট করবে (সতর্কতা: এটি পার্মানেন্টলি ডিলিট করবে)
router.delete('/admin/delete/:id', requireAuth, isAdmin, controller.deleteOrderAdmin);

export default router;
