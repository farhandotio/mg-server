import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

export const createReviewValidation = [
  body('productId').isMongoId().withMessage('অবৈধ প্রোডাক্ট আইডি'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('রেটিং ১ থেকে ৫ এর মধ্যে হতে হবে'),
  body('comment').isLength({ min: 10 }).withMessage('মন্তব্য কমপক্ষে ১০ অক্ষরের হতে হবে'),
  validate,
];
