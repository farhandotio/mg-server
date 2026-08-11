import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

export const brandValidation = [
  body('name').trim().notEmpty().withMessage('ব্র্যান্ড নাম আবশ্যক').isLength({ min: 2 }),
  validate,
];
