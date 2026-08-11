import userModel from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import sendEmail from '../utils/email.js';
import { redisClient } from '../config/redis.js';

const getGoogleAuthURL = (state = '/') => {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    client_id: process.env.GOOGLE_ID,
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  };

  return `${rootUrl}?${new URLSearchParams(options).toString()}`;
};

const normalizeGoogleRedirect = (state) => {
  if (!state) return process.env.FRONTEND_URL || 'http://localhost:3000';
  if (state.startsWith('/'))
    return `${process.env.FRONTEND_URL || 'http://localhost:3000'}${state}`;
  if (
    (process.env.FRONTEND_URL && state.startsWith(process.env.FRONTEND_URL)) ||
    state.startsWith('http')
  ) {
    return state;
  }
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};

// Cookie options helper function jate bar bar likhte na hoy
const setAuthCookies = async (res, user) => {
  const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_KEY, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_KEY, { expiresIn: '7d' });

  await redisClient.set(`refresh_token:${user._id}`, refreshToken, {
    EX: 7 * 24 * 60 * 60,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  };

  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return { accessToken, refreshToken };
};

/** --- AUTHENTICATION --- **/

export const register = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    const isUserExist = await userModel.findOne({ email: email.toLowerCase() });
    if (isUserExist) return res.status(409).json({ message: 'এই ইমেলটি ইতিমধ্যেই ব্যবহৃত হয়েছে' });

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
        message: `হাই ${fullname}, নিবন্ধন সম্পন্ন করতে অনুগ্রহ করে আপনার একাউন্ট যাচাই করুন।`,
        buttonText: 'Verify Account',
        buttonUrl: verificationUrl,
      });

      res.status(201).json({
        success: true,
        message: 'নিবন্ধন সফল! যাচাইয়ের জন্য ইমেল চেক করুন।',
      });
    } catch (emailError) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res
        .status(500)
        .json({ message: 'ভেরিফিকেশন ইমেল পাঠানো সম্ভব হয়নি। পরে আবার চেষ্টা করুন।' });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
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

    await setAuthCookies(res, user);

    return res.redirect(`${process.env.FRONTEND_URL}/?status=success&message=verified`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL}/login?status=error&message=server_error`);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'ভুল লগইন তথ্য' });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        message: 'আপনার অ্যাকাউন্ট যাচাই হয়নি। অনুগ্রহ করে ইমেল চেক করুন।',
        isVerified: false,
      });
    }

    await setAuthCookies(res, user);

    res.status(200).json({
      success: true,
      user: { id: user._id, email: user.email, fullname: user.fullname, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

export const googleAuthRedirect = async (req, res) => {
  try {
    const callbackUrl = req.query.callbackUrl || '/';
    return res.redirect(getGoogleAuthURL(callbackUrl));
  } catch (err) {
    console.error('Google Redirect Error:', err);
    return res.status(500).json({ message: 'গুগল সাইন-ইন শুরু করা যায়নি' });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?status=error&message=missing_code`);
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_ID,
        client_secret: process.env.GOOGLE_SECRET,
        redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;
    const userInfoResponse = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const googleUser = userInfoResponse.data;
    if (!googleUser?.email_verified) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?status=error&message=google_email_not_verified`
      );
    }

    let user = await userModel.findOne({ email: googleUser.email.toLowerCase() });
    if (!user) {
      const randomPassword = crypto.randomBytes(20).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await userModel.create({
        email: googleUser.email.toLowerCase(),
        fullname: googleUser.name || googleUser.email.split('@')[0],
        image: googleUser.picture || '',
        password: passwordHash,
        isVerified: true,
      });
    } else {
      user.fullname = googleUser.name || user.fullname;
      user.image = googleUser.picture || user.image;
      user.isVerified = true;
      await user.save();
    }

    await setAuthCookies(res, user);

    const redirectUrl = normalizeGoogleRedirect(state);
    return res.redirect(`${redirectUrl}?googleAuth=success`);
  } catch (err) {
    console.error('Google Callback Error:', err?.response?.data || err.message || err);
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?status=error&message=google_login_failed`
    );
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded) {
        await redisClient.del(`refresh_token:${decoded.id}`);
      }
    }

    res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });

    res.status(200).json({ message: 'লগআউট সফল হয়েছে' });
  } catch (err) {
    res.status(500).json({ message: 'লগআউট ব্যর্থ হয়েছে' });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'রিফ্রেশ টোকেন পাওয়া যায়নি' });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, async (err, decoded) => {
      if (err) return res.status(403).json({ message: 'মেয়াদোত্তীর্ণ বা অবৈধ টোকেন' });

      // Redis theke check koro
      const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);

      // Token jodi Redis-e na thake ba match na kore
      if (!storedToken || storedToken !== refreshToken) {
        return res.status(403).json({ message: 'সেশন মেয়াদ শেষ হয়েছে, পুনরায় লগইন করুন' });
      }

      const newAccessToken = jwt.sign({ id: decoded.id }, process.env.JWT_ACCESS_KEY, {
        expiresIn: '15m',
      });

      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });

      res.status(200).json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

/** --- PASSWORD MANAGEMENT --- **/

export const forgotPassword = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'ব্যবহারকারী পাওয়া যায়নি' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message: 'পাসওয়ার্ড রিসেট করতে নিচের বোতামে ক্লিক করুন।',
      buttonText: 'Reset Password',
      buttonUrl: resetURL,
    });
    res.status(200).json({ message: 'টোকেন ইমেলে পাঠানো হয়েছে' });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await userModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'টোকেন অবৈধ বা মেয়াদোত্তীর্ণ' });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে' });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select('+password');
    if (!(await bcrypt.compare(req.body.currentPassword, user.password)))
      return res.status(401).json({ message: 'বর্তমান পাসওয়ার্ড সঠিক নয়' });

    user.password = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();
    res.status(200).json({ message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে' });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

/** --- PROFILE & ADDRESSES --- **/

export const profile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await userModel.findByIdAndUpdate(req.user.id, req.body, { new: true });
    res.json({ message: 'প্রোফাইল আপডেট হয়েছে', user });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select('addresses');
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
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
    res.status(500).json({ message: 'ঠিকানা যোগ করা ব্যর্থ হয়েছে' });
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
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
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
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await userModel.findByIdAndUpdate(
      req.user.id,
      { $pull: { addresses: { _id: req.params.addressId } } },
      { new: true }
    );
    res.json({ message: 'মুছে ফেলা হয়েছে', addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

/** --- ADMIN --- **/

export const allUsers = async (req, res) => {
  try {
    const users = await userModel.find();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    const user = await userModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await userModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'ব্যবহারকারী মুছে ফেলা হয়েছে' });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};
