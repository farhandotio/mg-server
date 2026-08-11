export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigin = process.env.FRONTEND_URL;

  let requestOrigin = origin;
  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch (err) {
      console.error('Invalid Referer Header:', referer);
    }
  }

  if (!allowedOrigin) {
    console.warn('⚠️ Warning: FRONTEND_URL is not defined in environment variables!');
    return next();
  }

  if (!requestOrigin || requestOrigin.replace(/\/$/, '') !== allowedOrigin.replace(/\/$/, '')) {
    console.error(`🔴 CSRF Blocked: From ${requestOrigin}, Expected ${allowedOrigin}`);
    return res.status(403).json({
      success: false,
      message: 'নিরোধিত: CSRF যাচাইকরণ ব্যর্থ হয়েছে।',
    });
  }

  next();
};
