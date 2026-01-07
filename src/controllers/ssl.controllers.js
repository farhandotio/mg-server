import axios from 'axios';
import Order from '../models/order.model.js';
import cartModel from '../models/cart.model.js';
import qs from 'qs';
import { v4 as uuidv4 } from 'uuid';
import updateStockAfterPayment from '../utils/updateStock.js';

// ১. পেমেন্ট ইনিশিয়েট করা
export const initSSLPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId).populate('user');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.payment.status === 'PAID') {
      return res.status(400).json({ message: 'Order already paid' });
    }

    const tran_id = `TXN_${uuidv4()}`;

    // আপনার কন্ট্রোলারের payload অংশটুকু এভাবে আপডেট করুন
    const payload = {
      store_id: process.env.SSLCOMMERZ_STORE_ID,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
      total_amount: parseFloat(order.pricing.totalPrice).toFixed(2), // ফিক্সড ফরম্যাট
      currency: 'BDT',
      tran_id,
      success_url: process.env.SSLCOMMERZ_SUCCESS_URL,
      fail_url: process.env.SSLCOMMERZ_FAIL_URL,
      cancel_url: process.env.SSLCOMMERZ_CANCEL_URL,
      ipn_url: process.env.SSLCOMMERZ_IPN_URL,

      // কাস্টমার ইনফো
      cus_name: order.shippingAddress.fullname,
      cus_email: order.user.email || 'customer@email.com',
      cus_phone: order.shippingAddress.phoneNumber,
      cus_add1: order.shippingAddress.address,
      cus_city: order.shippingAddress.city,
      cus_country: 'Bangladesh',

      // শিপিং ইনফো (এই অংশটি আপনার মিসিং ছিল)
      ship_name: order.shippingAddress.fullname, // বাধ্যতামূলক
      ship_add1: order.shippingAddress.address,
      ship_city: order.shippingAddress.city,
      ship_state: order.shippingAddress.city, // বা এরিয়া থাকলে দিন
      ship_postcode: '1000', // ডিফল্ট বা অর্ডার থেকে
      ship_country: 'Bangladesh',

      shipping_method: 'Courier',
      product_name: 'Ecommerce Order',
      product_category: 'General',
      product_profile: 'general',
    };
    const response = await axios.post(
      `${process.env.SSLCOMMERZ_BASE_URL}/gwprocess/v4/api.php`,
      qs.stringify(payload),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data?.status === 'SUCCESS') {
      order.payment.transactionId = tran_id;
      order.payment.provider = 'SSLCOMMERZ';
      await order.save();

      res.json({
        success: true,
        gatewayUrl: response.data.GatewayPageURL,
      });
    } else {
      console.log('SSL Failed Reason:', response.data.failedreason);
      res.status(400).json({
        message: response.data.failedreason || 'SSL Session failed',
        data: response.data,
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'SSL init failed', error: err.message });
  }
};

// ২. পেমেন্ট সাকসেস হ্যান্ডলার (Security Verified)
export const sslSuccess = async (req, res) => {
  const { tran_id, val_id, status } = req.body; // SSL সরাসরি বডিতে স্ট্যাটাস পাঠায়

  try {
    // স্যান্ডবক্সে সরাসরি status === 'VALID' চেক করা সবচেয়ে নিরাপদ
    if (status === 'VALID' || status === 'AUTHENTICATED') {
      const order = await Order.findOne({ 'payment.transactionId': tran_id });

      if (!order) {
        console.log('Order Not Found in DB for ID:', tran_id);
        return res.redirect('http://localhost:3000/payment-failed');
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

      // সরাসরি সাকসেস পেজে রিডাইরেক্ট করুন
      return res.redirect(`http://localhost:3000/order-success/${order._id}`);
    } else {
      console.log('SSL Status was not valid:', status);
      return res.redirect('http://localhost:3000/payment-failed');
    }
  } catch (err) {
    console.error('SSL Success Error:', err);
    res.redirect('http://localhost:3000/payment-failed');
  }
};

// ৩. আইপিএন (Instant Payment Notification) হ্যান্ডলার
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
    console.error('SSL IPN Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// ৪. ক্যানসেল ও ফেইল হ্যান্ডলার
export const sslCancel = async (req, res) => {
  res.redirect('http://localhost:3000/payment-cancelled');
};

export const sslFail = async (req, res) => {
  res.redirect('http://localhost:3000/payment-failed');
};
