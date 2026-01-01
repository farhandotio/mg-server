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
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid Product ID format'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('sessionId').notEmpty().withMessage('Session ID is required for guest users'),

  validate,
];

export const removeFromCartValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid Product ID format'),

  body('sessionId').notEmpty().withMessage('Session ID is required'),

  validate,
];

export const getCartValidation = [
  query('sessionId').notEmpty().withMessage('Session ID is required to fetch cart'),

  validate,
];

export const mergeCartValidation = [
  body('sessionId').notEmpty().withMessage('Session ID is required to merge guest cart'),

  validate,
];
