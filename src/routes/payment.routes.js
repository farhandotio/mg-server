import express from 'express';
import {
  initSSLPayment,
  sslSuccess,
  sslFail,
  sslCancel,
  sslIPN,
} from '../controllers/ssl.controllers.js';

import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/ssl/init', requireAuth, initSSLPayment);

router.post('/ssl/success', sslSuccess);
router.post('/ssl/fail', sslFail);
router.post('/ssl/cancel', sslCancel);
router.post('/ssl/ipn', sslIPN);

export default router;
