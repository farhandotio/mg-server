export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigin = process.env.FRONTEND_URL;

  const requestOrigin = origin || (referer && new URL(referer).origin);

  if (!requestOrigin || requestOrigin !== allowedOrigin) {
    console.error(`CSRF Blocked: Request from ${requestOrigin}, expected ${allowedOrigin}`);
    return res.status(403).json({
      success: false,
      message: 'CSRF Attack Blocked: Request origin is not allowed.',
    });
  }

  next();
};
