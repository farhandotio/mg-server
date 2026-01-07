import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // সার্ভার লগে ডিটেইল এরর প্রিন্ট হবে
    console.error('❌ Validation Errors:', JSON.stringify(errors.array(), null, 2));

    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg, // ইউজারের জন্য সহজ মেসেজ
      errors: errors.array(), // ডেভেলপারকে ডিবাগ করতে সাহায্য করবে
    });
  }
  next();
};

export const createOrderValidation = [
  // ১. Order Items চেক
  body('orderItems').isArray({ min: 1 }).withMessage('কার্ট খালি হতে পারবে না'),
  body('orderItems.*.product').isMongoId().withMessage('প্রোডাক্ট আইডি সঠিক নয়'),
  body('orderItems.*.quantity').isInt({ min: 1 }).withMessage('পরিমাণ সঠিক নয়'),
  body('orderItems.*.price').isNumeric().withMessage('প্রোডাক্টের দাম সঠিক নয়'),

  // ২. Shipping Address (User Model অনুযায়ী)
  body('shippingAddress.fullname').notEmpty().withMessage('নাম আবশ্যক'),
  body('shippingAddress.phoneNumber').notEmpty().withMessage('ফোন নম্বর আবশ্যক'),
  body('shippingAddress.address').notEmpty().withMessage('ঠিকানা আবশ্যক'),
  body('shippingAddress.city').notEmpty().withMessage('শহর আবশ্যক'),
  body('shippingAddress.area').notEmpty().withMessage('এলাকা বা স্টেট আবশ্যক'),

  // ৩. Payment & Pricing
  body('payment.method').isIn(['COD', 'ONLINE']).withMessage('পেমেন্ট মেথড ভুল'),
  body('pricing.totalPrice').isFloat({ min: 0 }).withMessage('সর্বমোট দাম ভুল'),

  validate,
];
