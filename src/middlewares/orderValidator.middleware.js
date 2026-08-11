import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation Errors:', JSON.stringify(errors.array(), null, 2));

    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

export const createOrderValidation = [
  body('orderItems').isArray({ min: 1 }).withMessage('কার্ট খালি থাকতে পারে না'),
  body('orderItems.*.product').isMongoId().withMessage('অবৈধ প্রোডাক্ট আইডি ফরম্যাট'),
  body('orderItems.*.title').notEmpty().withMessage('প্রোডাক্ট শিরোনাম আবশ্যক'),
  body('orderItems.*.quantity').isInt({ min: 1 }).withMessage('পরিমাণ কমপক্ষে ১ হতে হবে'),
  body('orderItems.*.price').isNumeric().withMessage('প্রোডাক্টের মূল্য একটি সংখ্যা হতে হবে'),
  body('orderItems.*.image').notEmpty().withMessage('প্রোডাক্ট ইমেজ আবশ্যক'),

  // 2. Shipping Address (Matches Order model fields)
  body('shippingAddress.phone').notEmpty().withMessage('ফোন নম্বর আবশ্যক'),
  body('shippingAddress.street').notEmpty().withMessage('স্ট্রিট ঠিকানা বা বিবরণ আবশ্যক'),
  body('shippingAddress.city').notEmpty().withMessage('শহর আবশ্যক'),
  body('shippingAddress.state').notEmpty().withMessage('বিভাগ/রাজ্য বা বিভাগের নাম আবশ্যক'),
  body('shippingAddress.zip').notEmpty().withMessage('পোস্ট কোড আবশ্যক'),
  body('shippingAddress.country').notEmpty().withMessage('দেশের নাম আবশ্যক'),

  // 3. Payment Method
  body('payment.method')
    .isIn(['COD', 'ONLINE'])
    .withMessage('অচল পেমেন্ট পদ্ধতি. Choose COD or ONLINE'),

  // 4. Pricing Object
  body('pricing.itemsPrice').isNumeric().withMessage('আইটেমের সাবটোটাল অবশ্যই সংখ্যা হতে হবে'),
  body('pricing.shippingPrice').isNumeric().withMessage('শিপিং খরচ একটি সংখ্যা হতে হবে'),
  body('pricing.totalPrice').isFloat({ min: 0 }).withMessage('মোট মূল্য একটি বৈধ সংখ্যা হতে হবে'),

  validate,
];
