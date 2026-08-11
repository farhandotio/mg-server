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
    .withMessage('প্রোডাক্ট শিরোনাম আবশ্যক')
    .isLength({ max: 200 })
    .withMessage('শিরোনাম ২০০ অক্ষরের বেশি হতে পারবে না'),

  body('description').notEmpty().withMessage('প্রোডাক্ট বিবরণ আবশ্যক'),

  body('shortDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('স্বল্প বিবরণ সর্বাধিক ৫০০ অক্ষর হতে পারে'),

  body('category')
    .notEmpty()
    .withMessage('ক্যাটেগরি আইডি আবশ্যক')
    .isMongoId()
    .withMessage('অবৈধ ক্যাটেগরি আইডি ফরম্যাট'),

  body('brand')
    .notEmpty()
    .withMessage('ব্র্যান্ড আইডি আবশ্যক')
    .isMongoId()
    .withMessage('অবৈধ ব্র্যান্ড আইডি ফরম্যাট'),

  // Nested Price Validation
  body('price.base')
    .notEmpty()
    .withMessage('মূল দাম আবশ্যক')
    .isNumeric()
    .withMessage('মূল্য একটি সংখ্যা হতে হবে')
    .toFloat()
    .withMessage('মূল্য নেতিবাচক হতে পারে না'),

  // Offer Validation (Schema তে percentage: min 0, max 100 আছে)
  body('offer.percentage')
    .optional()
    .isNumeric()
    .withMessage('অফার শতকরা একটি সংখ্যা হতে হবে')
    .isInt({ min: 0, max: 100 })
    .withMessage('অফার শতকরা ০ থেকে ১০০ এর মধ্যে হতে হবে'),

  body('offer.deadline')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('অনির্ধারিত ডেডলাইন তারিখ ফরম্যাট'),

  body('stock')
    .notEmpty()
    .withMessage('স্টক পরিমাণ আবশ্যক')
    .isInt({ min: 0 })
    .withMessage('স্টক নেতিবাচক হতে পারে না'),

  body('sku').trim().notEmpty().withMessage('SKU আবশ্যক').toUpperCase(),

  body('productType')
    .optional()
    .isIn(['Regular', 'FlashSale', 'HotDeals', 'Featured', 'BestSeller', 'NewArrival'])
    .withMessage('অবৈধ প্রোডাক্ট টাইপ'),

  body('status')
    .optional()
    .isIn(['Draft', 'Published', 'OutOfStock', 'Archived'])
    .withMessage('অবৈধ স্ট্যাটাস টাইপ'),

  // Specifications Validation (Optional)
  body('specifications').optional(),

  validate,
];
