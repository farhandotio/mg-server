import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

export const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('image.url').notEmpty().withMessage('Image URL is required'),
  body('image.fileId').notEmpty().withMessage('Image fileId is required'),
  validate,
];
