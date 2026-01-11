import userModel from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/email.js';

/** --- AUTHENTICATION --- **/

export const register = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    const isUserExist = await userModel.findOne({ email: email.toLowerCase() });
    if (isUserExist) return res.status(409).json({ message: 'Email already exists.' });

    const hash = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      email: email.toLowerCase(),
      fullname,
      password: hash,
    });

    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/auth/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Verify your account - Gadget BDS',
        message: `Hi ${fullname}, Please verify your account to complete registration.`,
        buttonText: 'Verify Account',
        buttonUrl: verificationUrl,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
      });
    } catch (emailError) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res
        .status(500)
        .json({ message: 'Could not send verification email. Please try again later.' });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await userModel.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?status=error&message=invalid_token`);
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });

     res.cookie('token', token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       maxAge: 7 * 24 * 60 * 60 * 1000,
       sameSite: 'none',
       path: '/',
     });

    return res.redirect(`${process.env.FRONTEND_URL}/?status=success&message=verified`);
  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL}/login?status=error&message=server_error`);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        message: 'Your account is not verified. Please check your email.',
        isVerified: false,
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      path: '/',
    });

    res.status(200).json({
      success: true,
      user: { id: user._id, email: user.email, fullname: user.fullname, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

/** --- PASSWORD MANAGEMENT --- **/

export const forgotPassword = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message: 'Click below to reset your password.',
      buttonText: 'Reset Password',
      buttonUrl: resetURL,
    });
    res.status(200).json({ message: 'Token sent to email' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await userModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select('+password');
    if (!(await bcrypt.compare(req.body.currentPassword, user.password)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/** --- PROFILE & ADDRESSES --- **/

export const profile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await userModel.findByIdAndUpdate(req.user.id, req.body, { new: true });
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select('addresses');
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addAddress = async (req, res) => {
  try {
    const { phone, street, city, state, zip, country, isDefault } = req.body;

    if (isDefault) {
      await userModel.updateOne(
        { _id: req.user.id },
        { $set: { 'addresses.$[].isDefault': false } }
      );
    }

    const user = await userModel.findByIdAndUpdate(
      req.user.id,
      {
        $push: {
          addresses: { phone, street, city, state, zip, country, isDefault },
        },
      },
      { new: true, runValidators: true }
    );

    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (err) {
    console.error('Add Address Error:', err);
    res.status(500).json({ message: 'Failed to add address' });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const user = await userModel.findOneAndUpdate(
      { _id: req.user.id, 'addresses._id': req.params.addressId },
      { $set: { 'addresses.$': req.body } },
      { new: true }
    );
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    await userModel.updateOne({ _id: req.user.id }, { $set: { 'addresses.$[].isDefault': false } });
    const user = await userModel.findOneAndUpdate(
      { _id: req.user.id, 'addresses._id': req.params.addressId },
      { $set: { 'addresses.$.isDefault': true } },
      { new: true }
    );
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await userModel.findByIdAndUpdate(
      req.user.id,
      { $pull: { addresses: { _id: req.params.addressId } } },
      { new: true }
    );
    res.json({ message: 'Deleted', addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/** --- ADMIN --- **/

export const allUsers = async (req, res) => {
  try {
    const users = await userModel.find();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    const user = await userModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await userModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
