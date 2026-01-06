import axios from 'axios';

const BKASH_URL = process.env.BKASH_BASE_URL?.replace(/\/+$/, '');

const getAuthHeaders = async () => {
  try {
    const { data } = await axios.post(
      `${BKASH_URL}/checkout/token/grant`,
      {
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      },
      {
        headers: {
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: data.id_token, // নিশ্চিত করুন Authorization সঠিকভাবে যাচ্ছে
      'X-APP-Key': process.env.BKASH_APP_KEY,
    };
  } catch (err) {
    console.error('🔥 bKash Auth Error Details:', err.response?.data || err.message);
    throw err;
  }
};

export const createPaymentRequest = async (amount, orderId) => {
  try {
    const authHeaders = await getAuthHeaders();
    const { data } = await axios.post(
      `${BKASH_URL}/checkout/create`,
      {
        mode: '0011',
        payerReference: '01770618575', // স্যান্ডবক্সের জন্য যে কোনো নম্বর
        callbackURL: `${process.env.BACKEND_URL}/api/bkash/callback`,
        amount: parseFloat(amount).toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: orderId,
      },
      { headers: authHeaders }
    );
    return data;
  } catch (err) {
    console.error('🔥 Create Error:', err.response?.data || err.message);
    throw err;
  }
};

export const executePaymentRequest = async (paymentID) => {
  try {
    const authHeaders = await getAuthHeaders();
    const { data } = await axios.post(
      `${BKASH_URL}/checkout/execute`,
      { paymentID },
      { headers: authHeaders }
    );
    return data;
  } catch (err) {
    console.error('🔥 Execute Error:', err.response?.data || err.message);
    throw err;
  }
};
