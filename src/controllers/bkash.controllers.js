import { createPaymentRequest, executePaymentRequest } from '../services/bkash.service.js';
import orderModel from '../models/order.model.js';

export const payWithBkash = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const paymentResponse = await createPaymentRequest(order.totalPrice, orderId);

    if (paymentResponse.bkashURL) {
      res.json({ url: paymentResponse.bkashURL });
    } else {
      res.status(400).json({ message: 'Could not generate bKash URL' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const bkashCallback = async (req, res) => {
  const { paymentID, status } = req.query;

  if (status === 'success') {
    try {
      const verification = await executePaymentRequest(paymentID);

      if (verification.statusCode === '0000') {
        // পেমেন্ট সফল, অর্ডার আপডেট করুন
        await orderModel.findOneAndUpdate(
          { _id: verification.merchantInvoiceNumber },
          {
            paymentStatus: 'Paid',
            paymentInfo: {
              trID: verification.trxID,
              paymentID: verification.paymentID,
              date: verification.paymentExecuteTime,
            },
          }
        );
        return res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
      }
    } catch (err) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment-fail`);
    }
  }
  res.redirect(`${process.env.FRONTEND_URL}/payment-fail`);
};
