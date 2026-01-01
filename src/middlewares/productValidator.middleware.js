import { body, validationResult } from 'express-validator';

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

export const productValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Product title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('description').notEmpty().withMessage('Product description is required'),

  body('category')
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Invalid Category ID format'),

  body('brand')
    .notEmpty()
    .withMessage('Brand ID is required')
    .isMongoId()
    .withMessage('Invalid Brand ID format'),

  body('price.base')
    .notEmpty()
    .withMessage('Base price is required')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value) => value >= 0)
    .withMessage('Price cannot be negative'),

  body('stock')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock cannot be negative'),

  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isUppercase()
    .withMessage('SKU must be in uppercase'),

  body('productType')
    .optional()
    .isIn(['Regular', 'FlashSale', 'Featured', 'BestSeller', 'NewArrival'])
    .withMessage('Invalid product type'),

  body('status')
    .optional()
    .isIn(['Draft', 'Published', 'OutOfStock', 'Archived'])
    .withMessage('Invalid status type'),

  validate,
];
