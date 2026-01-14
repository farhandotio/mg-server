import axios from 'axios';
import Order from '../models/order.model.js';
import cartModel from '../models/cart.model.js';
import qs from 'qs';
import { v4 as uuidv4 } from 'uuid';
import updateStockAfterPayment from '../utils/updateStock.js';

// ১. পেমেন্ট ইনিশিয়েট করা
// export const initSSLPayment = async (req, res) => {
//   try {
//     const { orderId } = req.body;

//     const order = await Order.findById(orderId).populate('user');

//     if (!order) return res.status(404).json({ message: 'Order not found' });

//     if (order.payment.status === 'PAID') {
//       return res.status(400).json({ message: 'Order already paid' });
//     }

//     const tran_id = `TXN_${uuidv4()}`;

//     const payload = {
//       store_id: process.env.SSLCOMMERZ_STORE_ID,

//       store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,

//       total_amount: parseFloat(order.pricing.totalPrice).toFixed(2),

//       currency: 'BDT',

//       tran_id,

//       success_url: process.env.SSLCOMMERZ_SUCCESS_URL,

//       fail_url: process.env.SSLCOMMERZ_FAIL_URL,

//       cancel_url: process.env.SSLCOMMERZ_CANCEL_URL,

//       ipn_url: process.env.SSLCOMMERZ_IPN_URL,

//       // কাস্টমার ইনফো

//       cus_name: order.shippingAddress.fullname,

//       cus_email: order.user.email || 'customer@email.com',

//       cus_phone: order.shippingAddress.phoneNumber,

//       cus_add1: order.shippingAddress.address,

//       cus_city: order.shippingAddress.city,

//       cus_country: 'Bangladesh',

//       ship_name: order.shippingAddress.fullname,

//       ship_add1: order.shippingAddress.address,

//       ship_city: order.shippingAddress.city,

//       ship_state: order.shippingAddress.city,

//       ship_postcode: '1000',

//       ship_country: 'Bangladesh',

//       shipping_method: 'Courier',

//       product_name: 'Ecommerce Order',

//       product_category: 'General',

//       product_profile: 'general',
//     };

//     const response = await axios.post(
//       `${process.env.SSLCOMMERZ_BASE_URL}/gwprocess/v4/api.php`,

//       qs.stringify(payload),

//       { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
//     );

//     if (response.data?.status === 'SUCCESS') {
//       order.payment.transactionId = tran_id;

//       order.payment.provider = 'SSLCOMMERZ';

//       await order.save();

//       res.json({
//         success: true,

//         gatewayUrl: response.data.GatewayPageURL,
//       });
//     } else {
//       console.log('SSL Failed Reason:', response.data.failedreason);

//       res.status(400).json({
//         message: response.data.failedreason || 'SSL Session failed',

//         data: response.data,
//       });
//     }
//   } catch (err) {
//     res.status(500).json({ message: 'SSL init failed', error: err.message });
//   }
// };

// ১. পেমেন্ট ইনিশিয়েট করা
export const initSSLPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId).populate('user');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.payment.status === 'PAID') {
      return res.status(400).json({ message: 'Order already paid' });
    }

    const tran_id = `TXN_${uuidv4().split('-')[0].toUpperCase()}`; // ছোট এবং ক্লিন আইডি

    const payload = {
      store_id: process.env.SSLCOMMERZ_STORE_ID,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
      total_amount: parseFloat(order.pricing.totalPrice).toFixed(2),
      currency: 'BDT',
      tran_id,
      success_url: process.env.SSLCOMMERZ_SUCCESS_URL,
      fail_url: process.env.SSLCOMMERZ_FAIL_URL,
      cancel_url: process.env.SSLCOMMERZ_CANCEL_URL,
      ipn_url: process.env.SSLCOMMERZ_IPN_URL,

      // কাস্টমার ইনফো (আপনার ফ্রন্টএন্ডের সাথে ১০০% ম্যাচিং)
      cus_name: order.user?.fullname || 'Customer', 
      cus_email: order.user?.email || 'customer@email.com',
      cus_phone: order.shippingAddress.phone || '01XXXXXXXXX', 
      cus_add1: order.shippingAddress.street || 'N/A', 
      cus_city: order.shippingAddress.city || 'Dhaka',
      cus_state: order.shippingAddress.state || 'Dhaka',
      cus_postcode: order.shippingAddress.zip || '1000',
      cus_country: order.shippingAddress.country || 'Bangladesh',

      // শিপিং ইনফো (একই রাখা হয়েছে)
      ship_name: order.user?.fullname || 'Customer',
      ship_add1: order.shippingAddress.street,
      ship_city: order.shippingAddress.city,
      ship_state: order.shippingAddress.state,
      ship_postcode: order.shippingAddress.zip,
      ship_country: order.shippingAddress.country || 'Bangladesh',

      shipping_method: 'Courier',
      product_name: 'Gadget BDS Order',
      product_category: 'Electronics',
      product_profile: 'general',
    };

    const response = await axios.post(
      `${process.env.SSLCOMMERZ_BASE_URL}/gwprocess/v4/api.php`,
      qs.stringify(payload),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // SSLCOMMERZ থেকে আসা রেসপন্স চেক
    if (response.data?.status === 'SUCCESS' && response.data?.GatewayPageURL) {
      order.payment.transactionId = tran_id;
      order.payment.provider = 'SSLCOMMERZ';
      await order.save();

      res.json({
        success: true,
        gatewayUrl: response.data.GatewayPageURL,
      });
    } else {
      res.status(400).json({
        message: response.data?.failedreason || 'SSL Session creation failed',
        data: response.data,
      });
    }
  } catch (err) {
    console.error('SSL Init Error:', err);
    res.status(500).json({ message: 'Internal Server Error during payment init' });
  }
};

// ২. পেমেন্ট সাকসেস হ্যান্ডলার
export const sslSuccess = async (req, res) => {
  const { tran_id, val_id, status } = req.body;
  const FRONTEND_URL = process.env.FRONTEND_URL;

  try {
    if (status === 'VALID' || status === 'AUTHENTICATED') {
      const order = await Order.findOne({ 'payment.transactionId': tran_id });

      if (!order) {
        console.log('Order Not Found in DB for ID:', tran_id);
        return res.redirect(`${FRONTEND_URL}/payment-failed`);
      }

      if (order.payment.status !== 'PAID') {
        order.payment.status = 'PAID';
        order.payment.providerPaymentId = val_id;
        order.payment.paidAt = new Date();
        order.orderStatus = 'CONFIRMED';
        await order.save();
        await updateStockAfterPayment(order);
        await cartModel.findOneAndDelete({ user: order.user });
      }

      // অর্ডার সাকসেস হলে ফ্রন্টএন্ডে রিডাইরেক্ট
      return res.redirect(`${FRONTEND_URL}/order-success/${order._id}`);
    } else {
      return res.redirect(`${FRONTEND_URL}/payment-failed`);
    }
  } catch (err) {
    console.error('SSL Success Error:', err);
    res.redirect(`${FRONTEND_URL}/payment-failed`);
  }
};

// ৩. আইপিএন (Instant Payment Notification) হ্যান্ডলার
// IPN সাধারণত ব্যাকএন্ড টু ব্যাকএন্ড কাজ করে, রিডাইরেক্ট লাগে না
export const sslIPN = async (req, res) => {
  try {
    const { tran_id, status, val_id } = req.body;
    if (status === 'VALID' || status === 'AUTHENTICATED') {
      const order = await Order.findOne({ 'payment.transactionId': tran_id });
      if (order && order.payment.status !== 'PAID') {
        order.payment.status = 'PAID';
        order.payment.providerPaymentId = val_id;
        order.payment.paidAt = new Date();
        order.orderStatus = 'CONFIRMED';
        await order.save();
        await updateStockAfterPayment(order);
        await cartModel.findOneAndDelete({ user: order.user });
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
};

// ৪. ক্যানসেল ও ফেইল হ্যান্ডলার
export const sslCancel = async (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/payment-cancelled`);
};

export const sslFail = async (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
};
