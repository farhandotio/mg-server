import { body, validationResult } from 'express-validator';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation Errors:', JSON.stringify(errors.array(), null, 2));

    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

export const createOrderValidation = [
  body('orderItems').isArray({ min: 1 }).withMessage('Cart cannot be empty'),
  body('orderItems.*.product').isMongoId().withMessage('Invalid product ID format'),
  body('orderItems.*.title').notEmpty().withMessage('Product title is required'),
  body('orderItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('orderItems.*.price').isNumeric().withMessage('Product price must be a number'),
  body('orderItems.*.image').notEmpty().withMessage('Product image is required'),

  // 2. Shipping Address (Matches Order model fields)
  body('shippingAddress.phone').notEmpty().withMessage('Phone number is required'),
  body('shippingAddress.street').notEmpty().withMessage('Street address or details are required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State or Division is required'),
  body('shippingAddress.zip').notEmpty().withMessage('ZIP code is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country name is required'),

  // 3. Payment Method
  body('payment.method')
    .isIn(['COD', 'ONLINE'])
    .withMessage('Invalid payment method. Choose COD or ONLINE'),

  // 4. Pricing Object
  body('pricing.itemsPrice').isNumeric().withMessage('Items subtotal must be a number'),
  body('pricing.shippingPrice').isNumeric().withMessage('Shipping cost must be a number'),
  body('pricing.totalPrice').isFloat({ min: 0 }).withMessage('Total price must be a valid number'),

  validate,
];
