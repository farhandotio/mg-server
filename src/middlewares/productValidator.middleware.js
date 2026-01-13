import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      // ফিল্ড অনুযায়ী এরর মেসেজগুলোকে অর্গানাইজ করা হয়েছে
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
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

  body('shortDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),

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

  // Nested Price Validation
  body('price.base')
    .notEmpty()
    .withMessage('Base price is required')
    .isNumeric()
    .withMessage('Price must be a number')
    .toFloat()
    .withMessage('Price cannot be negative'),

  // Offer Validation (Schema তে percentage: min 0, max 100 আছে)
  body('offer.percentage')
    .optional()
    .isNumeric()
    .withMessage('Offer percentage must be a number')
    .isInt({ min: 0, max: 100 })
    .withMessage('Offer percentage must be between 0 and 100'),

  body('offer.deadline')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid deadline date format'),

  body('stock')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock cannot be negative'),

  body('sku').trim().notEmpty().withMessage('SKU is required').toUpperCase(),

  body('productType')
    .optional()
    .isIn(['Regular', 'FlashSale', 'HotDeals', 'Featured', 'BestSeller', 'NewArrival'])
    .withMessage('Invalid product type'),

  body('status')
    .optional()
    .isIn(['Draft', 'Published', 'OutOfStock', 'Archived'])
    .withMessage('Invalid status type'),

  // Specifications Validation (Optional)
  body('specifications').optional(),

  validate,
];
