import jwt from 'jsonwebtoken';
import userModel from '../models/user.model.js';

// -------------------- REQUIRE LOGIN -------------------- //
const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please login.' });
    }

    jwt.verify(token, process.env.JWT_ACCESS_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Access token expired or invalid.' });
      }

      const user = await userModel.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'User no longer exists.' });
      }

      req.user = user;
      next();
    });
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return res.status(500).json({ message: 'Internal server error during authentication.' });
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
    return res.status(401).json({ message: 'Unauthorized. Please login first.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  next();
};

export { requireAuth, isAdmin, optionalAuth };
