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
    .withMessage('পূর্ণ নাম আবশ্যক।')
    .isLength({ min: 3 })
    .withMessage('পূর্ণ নাম কমপক্ষে ৩ অক্ষরের হতে হবে।'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('ইমেল আবশ্যক।')
    .isEmail()
    .withMessage('একটি বৈধ ইমেল ঠিকানা দিন।')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('পাসওয়ার্ড আবশ্যক।')
    .isLength({ min: 6 })
    .withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'),

  responseWithValidationErrors,
];

// -------------------- LOGIN VALIDATIONS -------------------- //
const loginUserValidations = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('ইমেল আবশ্যক।')
    .isEmail()
    .withMessage('একটি বৈধ ইমেল ঠিকানা দিন।'),

  body('password').notEmpty().withMessage('পাসওয়ার্ড আবশ্যক।'),

  responseWithValidationErrors,
];

// -------------------- FORGOT PASSWORD VALIDATIONS -------------------- //
const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('ইমেল আবশ্যক।')
    .isEmail()
    .withMessage('একটি বৈধ ইমেল ঠিকানা দিন।'),

  responseWithValidationErrors,
];

// -------------------- RESET PASSWORD VALIDATIONS -------------------- //
const resetPasswordValidation = [
  body('password')
    .notEmpty()
    .withMessage('নতুন পাসওয়ার্ড আবশ্যক।')
    .isLength({ min: 6 })
    .withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'),

  responseWithValidationErrors,
];

// -------------------- ADDRESS VALIDATIONS -------------------- //
const addAddressValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('ফোন নম্বর আবশ্যক।')
    .isLength({ min: 11, max: 15 })
    .withMessage('একটি বৈধ ফোন নম্বর দিন।'),

  body('street').trim().notEmpty().withMessage('স্ট্রিট ঠিকানা আবশ্যক।'),
  body('city').trim().notEmpty().withMessage('শহর আবশ্যক।'),
  body('state').trim().notEmpty().withMessage('বিভাগ/রাজ্য আবশ্যক।'),
  body('zip').trim().notEmpty().withMessage('পোস্ট কোড আবশ্যক।'),
  body('country').trim().notEmpty().withMessage('দেশ আবশ্যক।'),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault অবশ্যই একটি বুলিয়ান মান হতে হবে।'),

  responseWithValidationErrors,
];

export {
  registerUserValidations,
  loginUserValidations,
  addAddressValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};
