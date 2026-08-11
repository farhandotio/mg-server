import express from 'express';
import * as controller from '../controllers/auth.controllers.js';
import * as validators from '../middlewares/authValidator.middleware.js';
import * as middleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// AUTH
router.get('/google', controller.googleAuthRedirect);
router.get('/google/callback', controller.googleCallback);
router.post('/register', validators.registerUserValidations, controller.register);
router.get('/verify-email/:token', controller.verifyEmail);
router.post('/login', validators.loginUserValidations, controller.login);
router.post('/logout', controller.logout);
router.post('/refresh-token', controller.refresh);

// PASSWORD MANAGEMENT
router.post('/forgot-password', validators.forgotPasswordValidation, controller.forgotPassword);
router.patch(
  '/reset-password/:token',
  validators.resetPasswordValidation,
  controller.resetPassword
);
router.patch('/update-my-password', middleware.requireAuth, controller.updatePassword);

// USER PROFILE
router.get('/user/profile', middleware.requireAuth, controller.profile);
router.patch('/user/update-me', middleware.requireAuth, controller.updateUser);

// ADDRESSES
router.get('/user/addresses', middleware.requireAuth, controller.getAddresses);
router.post(
  '/user/addresses',
  validators.addAddressValidation,
  middleware.requireAuth,
  controller.addAddress
);
router.patch('/user/addresses/:addressId', middleware.requireAuth, controller.updateAddress);
router.patch(
  '/user/addresses/:addressId/set-default',
  middleware.requireAuth,
  controller.setDefaultAddress
);
router.delete('/user/addresses/:addressId', middleware.requireAuth, controller.deleteAddress);

// ADMIN ONLY
router.get('/users', middleware.requireAuth, middleware.isAdmin, controller.allUsers);
router.patch(
  '/users/:id',
  middleware.requireAuth,
  middleware.isAdmin,
  controller.updateUserByAdmin
);
router.delete('/users/:id', middleware.requireAuth, middleware.isAdmin, controller.deleteUser);

export default router;
