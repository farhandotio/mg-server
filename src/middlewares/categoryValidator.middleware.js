import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

export const categoryValidation = [
  body('name').trim().notEmpty().withMessage('ক্যাটেগরি নাম আবশ্যক'),
  body('image.url').notEmpty().withMessage('ইমেজ URL আবশ্যক'),
  body('image.fileId').notEmpty().withMessage('ইমেজ fileId আবশ্যক'),
  validate,
];
