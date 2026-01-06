import { createPaymentRequest, executePaymentRequest } from '../services/bkash.service.js';
import orderModel from '../models/order.model.js';

export const payWithBkash = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const paymentResponse = await createPaymentRequest(order.totalPrice, orderId);

    // বিকাশ থেকে পাওয়া URL ফ্রন্টএন্ডে পাঠানো
    if (paymentResponse.bkashURL) {
      res.json({ url: paymentResponse.bkashURL });
    } else {
      console.error('No bkashURL in response:', paymentResponse);
      res
        .status(400)
        .json({ message: paymentResponse.statusMessage || 'Could not generate bKash URL' });
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

      // statusCode 0000 মানে পেমেন্ট সফল
      if (verification.statusCode === '0000') {
        await orderModel.findByIdAndUpdate(verification.merchantInvoiceNumber, {
          paymentStatus: 'Paid',
          paymentMethod: 'bKash',
          paymentInfo: {
            trID: verification.trxID,
            paymentID: verification.paymentID,
            date: verification.paymentExecuteTime,
          },
        });
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-success?orderId=${verification.merchantInvoiceNumber}`
        );
      } else {
        console.error('Verification Status Code Error:', verification.statusMessage);
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-fail?message=${verification.statusMessage}`
        );
      }
    } catch (err) {
      console.error('Callback Execution Error:', err.message);
      return res.redirect(`${process.env.FRONTEND_URL}/payment-fail`);
    }
  }

  // ক্যানসেল বা ফেইল হলে
  res.redirect(`${process.env.FRONTEND_URL}/payment-fail`);
};
