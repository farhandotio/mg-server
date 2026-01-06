import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

export const createOrderValidation = [
  body('shippingAddress.fullname').notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('shippingAddress.address').notEmpty().withMessage('Address is required'),
  body('paymentMethod').isIn(['COD', 'Online']).withMessage('Invalid payment method'),
  validate,
];
