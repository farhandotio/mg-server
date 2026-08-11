import { body, query, validationResult } from 'express-validator';

// Error handling middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
    });
  }
  next();
};

export const addToCartValidation = [
  body('productId')
    .notEmpty()
    .withMessage('প্রোডাক্ট আইডি আবশ্যক')
    .isMongoId()
    .withMessage('অবৈধ প্রোডাক্ট আইডি ফরম্যাট'),

  body('quantity')
    .notEmpty()
    .withMessage('পরিমাণ আবশ্যক')
    .isInt({ min: 1 })
    .withMessage('পরিমাণ কমপক্ষে ১ হতে হবে'),

  body('sessionId').notEmpty().withMessage('গেস্ট ব্যবহারকারীর জন্য সেশন আইডি আবশ্যক'),

  validate,
];

export const removeFromCartValidation = [
  body('productId')
    .notEmpty()
    .withMessage('প্রোডাক্ট আইডি আবশ্যক')
    .isMongoId()
    .withMessage('অবৈধ প্রোডাক্ট আইডি ফরম্যাট'),

  body('sessionId').notEmpty().withMessage('সেশন আইডি আবশ্যক'),

  validate,
];

export const getCartValidation = [
  query('sessionId').notEmpty().withMessage('কার্ট আনতে সেশন আইডি আবশ্যক'),

  validate,
];

export const mergeCartValidation = [
  body('sessionId').notEmpty().withMessage('গেস্ট কার্ট মার্জ করতে সেশন আইডি আবশ্যক'),

  validate,
];
