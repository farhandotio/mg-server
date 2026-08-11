import jwt from 'jsonwebtoken';
import userModel from '../models/user.model.js';

// -------------------- REQUIRE LOGIN -------------------- //
const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ message: 'প্রমাণীকরণ প্রয়োজন। অনুগ্রহ করে লগইন করুন।' });
    }

    jwt.verify(token, process.env.JWT_ACCESS_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'অ্যাক্সেস টোকেন মেয়াদোত্তীর্ণ বা অবৈধ।' });
      }

      const user = await userModel.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'ব্যবহারকারী আর বিদ্যমান নেই।' });
      }

      req.user = user;
      next();
    });
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return res.status(500).json({ message: 'প্রমাণীকরণের সময় অভ্যন্তরীণ সার্ভার ত্রুটি।' });
  }
};

// -------------------- OPTIONAL LOGIN -------------------- //
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_ACCESS_KEY, async (err, decoded) => {
      if (err) {
        req.user = null;
        return next();
      }

      const user = await userModel.findById(decoded.id).select('-password');
      req.user = user || null;
      next();
    });
  } catch (err) {
    req.user = null;
    next();
  }
};

// -------------------- ADMIN ONLY -------------------- //
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'অনুমোদিত নয়। আগে লগইন করুন।' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'অ্যাক্সেস প্রত্যাখ্যাত। শুধুমাত্র অ্যাডমিনদের জন্য।' });
  }

  next();
};

export { requireAuth, isAdmin, optionalAuth };
