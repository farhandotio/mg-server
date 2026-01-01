// middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import userModel from '../models/user.model.js';

// -------------------- REQUIRE LOGIN -------------------- //
const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please login.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await userModel.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// -------------------- OPTIONAL LOGIN (Browsing without Login) -------------------- //
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await userModel.findById(decoded.id).select('-password');

    req.user = user || null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// -------------------- ADMIN ONLY -------------------- //
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized. Please login first.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  next();
};

export { requireAuth, optionalAuth, isAdmin };
