import { body, validationResult } from 'express-validator';

// -------------------- HANDLE VALIDATION ERRORS -------------------- //
const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// -------------------- REGISTER VALIDATIONS -------------------- //
const registerUserValidations = [
  body('fullname')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 3 })
    .withMessage('Full name must be at least 3 characters long.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),

  responseWithValidationErrors,
];

// -------------------- LOGIN VALIDATIONS -------------------- //
const loginUserValidations = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.'),

  body('password').notEmpty().withMessage('Password is required.'),

  responseWithValidationErrors,
];

// -------------------- FORGOT PASSWORD VALIDATIONS -------------------- //
const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.'),

  responseWithValidationErrors,
];

// -------------------- RESET PASSWORD VALIDATIONS -------------------- //
const resetPasswordValidation = [
  body('password')
    .notEmpty()
    .withMessage('New password is required.')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),

  responseWithValidationErrors,
];

// -------------------- ADDRESS VALIDATIONS -------------------- //
const addAddressValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required.')
    .isLength({ min: 11, max: 15 })
    .withMessage('Enter a valid phone number.'),

  body('street').trim().notEmpty().withMessage('Street address is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('state').trim().notEmpty().withMessage('State is required.'),
  body('zip').trim().notEmpty().withMessage('ZIP code is required.'),
  body('country').trim().notEmpty().withMessage('Country is required.'),

  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean (true/false)'),

  responseWithValidationErrors,
];

export {
  registerUserValidations,
  loginUserValidations,
  addAddressValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};
