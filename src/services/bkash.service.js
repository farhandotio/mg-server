import axios from 'axios';

const BKASH_URL = process.env.BKASH_BASE_URL;

const headers = async () => {
  const { data } = await axios.post(
    `${BKASH_URL}/tokenized/checkout/token/grant`,
    {
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    },
    {
      headers: {
        username: process.env.BKASH_USERNAME,
        password: process.env.BKASH_PASSWORD,
      },
    }
  );
  return {
    'Content-Type': 'application/json',
    Authorization: data.id_token,
    'X-APP-Key': process.env.BKASH_APP_KEY,
  };
};

// ১. পেমেন্ট তৈরি করা
export const createPaymentRequest = async (amount, orderId) => {
  try {
    const authHeaders = await headers();
    const { data } = await axios.post(
      `${BKASH_URL}/tokenized/checkout/create`,
      {
        amount: amount,
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: orderId,
        callbackURL: `${process.env.BACKEND_URL}/api/bkash/callback`, // পেমেন্ট শেষে যেখানে আসবে
      },
      { headers: authHeaders }
    );

    return data; // এটি একটি bkashURL রিটার্ন করবে
  } catch (err) {
    throw new Error('bKash Payment Creation Failed');
  }
};

// ২. পেমেন্ট ভেরিফাই বা এক্সিকিউট করা
export const executePaymentRequest = async (paymentID) => {
  try {
    const authHeaders = await headers();
    const { data } = await axios.post(
      `${BKASH_URL}/tokenized/checkout/execute`,
      {
        paymentID,
      },
      { headers: authHeaders }
    );

    return data;
  } catch (err) {
    throw new Error('bKash Payment Execution Failed');
  }
};
