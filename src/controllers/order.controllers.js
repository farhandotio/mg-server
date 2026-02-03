import orderModel from '../models/order.model.js';
import cartModel from '../models/cart.model.js';
import updateStockAfterPayment from '../utils/updateStock.js';

/** ==================== USER CONTROLLERS ==================== **/

export const createOrder = async (req, res) => {
  try {
    const { shippingAddress, payment, orderItems: frontendItems } = req.body;
    const userId = req.user._id;

    // ১. পেমেন্ট মেথড ভ্যালিডেশন (Validation middleware থাকলেও এখানে সেফটি চেক রাখা ভালো)
    if (!payment?.method || !['COD', 'ONLINE'].includes(payment.method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // ২. কার্ট খুঁজে বের করা
    const cart = await cartModel.findOne({ user: userId }).populate('items.product');

    if (!cart && (!frontendItems || frontendItems.length === 0)) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // ৩. প্রাইসিং ক্যালকুলেশন (shippingAddress.city এখন মডেলে আছে)
    const shippingPrice = shippingAddress.city.toLowerCase() === 'dhaka' ? 80 : 150;

    let orderItems = [];
    let itemsPrice = 0;

    // কার্ট থেকে ডাটা নেওয়া (অগ্রাধিকার বেশি) অথবা ফ্রন্টএন্ড থেকে
    if (cart && cart.items.length > 0) {
      orderItems = cart.items.map((item) => ({
        product: item.product._id,
        title: item.product.title,
        quantity: item.quantity,
        price: item.price,
        image: item.product.images[0]?.url || item.product.images[0] || '',
      }));
      itemsPrice = cart.totalPrice;
    } else {
      orderItems = frontendItems;
      itemsPrice = req.body.pricing?.itemsPrice || 0;
    }

    const totalPrice = itemsPrice + shippingPrice;

    // ৪. অর্ডার তৈরি
    const order = await orderModel.create({
      user: userId,
      orderItems,
      shippingAddress: {
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip,
        country: shippingAddress.country,
      },
      payment: {
        method: payment.method,
        status: 'PENDING',
        provider: payment.method === 'ONLINE' ? 'SSLCOMMERZ' : 'NONE',
      },
      pricing: {
        itemsPrice,
        shippingPrice,
        totalPrice,
      },
      orderStatus: payment.method === 'COD' ? 'CONFIRMED' : 'PENDING',
    });

    // ৫. কার্ট হ্যান্ডলিং (COD হলে এখনই ক্লিয়ার করুন)
    if (payment.method === 'COD' && cart) {
      await cartModel.findByIdAndDelete(cart._id);
    }

    return res.status(201).json({
      success: true,
      orderId: order._id,
      totalAmount: totalPrice,
      paymentRequired: payment.method === 'ONLINE',
    });
  } catch (err) {
    console.error('🔥 Order Create Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order. Please try again.' });
  }
};

export const createSingleOrder = async (req, res) => {
  try {
    const { shippingAddress, payment, orderItem } = req.body;
    const userId = req.user._id;

    if (!payment?.method || !['COD', 'ONLINE'].includes(payment.method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    if (!orderItem || !orderItem.product) {
      return res.status(400).json({ success: false, message: 'No product information provided' });
    }

    // ৩. প্রাইসিং ক্যালকুলেশন
    const shippingPrice = shippingAddress.city.toLowerCase() === 'dhaka' ? 80 : 150;
    
    // আইটেমের মোট দাম: quantity * price
    const itemsPrice = orderItem.price * orderItem.quantity;
    const totalPrice = itemsPrice + shippingPrice;

    // ৪. অর্ডার তৈরি
    const order = await orderModel.create({
      user: userId,
      orderItems: [{
        product: orderItem.product,
        title: orderItem.title,
        quantity: orderItem.quantity,
        price: orderItem.price,
        image: orderItem.image || '',
      }],
      shippingAddress: {
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip,
        country: shippingAddress.country,
      },
      payment: {
        method: payment.method,
        status: 'PENDING',
        provider: payment.method === 'ONLINE' ? 'SSLCOMMERZ' : 'NONE',
      },
      pricing: {
        itemsPrice,
        shippingPrice,
        totalPrice,
      },
      orderStatus: payment.method === 'COD' ? 'CONFIRMED' : 'PENDING',
    });

    return res.status(201).json({
      success: true,
      orderId: order._id,
      totalAmount: totalPrice,
      paymentRequired: payment.method === 'ONLINE',
    });
  } catch (err) {
    console.error('🔥 Single Order Create Error:', err);
    res.status(500).json({ success: false, message: 'Failed to process Buy Now order.' });
  }
};

export const myOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// ৩. Get Single Order Details
export const getOrderDetails = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // সিকিউরিটি চেক: অর্ডারটি ইউজারের নিজের কি না
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching order details' });
  }
};

// ৪. Cancel Order (User)
export const cancelOrder = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // ক্যানসেল করার শর্ত
    if (order.orderStatus !== 'PENDING' || order.payment.status === 'PAID') {
      return res
        .status(400)
        .json({ success: false, message: 'Order cannot be cancelled at this stage' });
    }

    order.orderStatus = 'CANCELLED';
    await order.save();

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** ==================== ADMIN CONTROLLERS ==================== **/

// ৫. Get All Orders (Admin)
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await orderModel
      .find()
      .populate('user', 'name email phoneNumber')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch all orders' });
  }
};

// ৬. Update Order Status (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await orderModel.findById(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.orderStatus === 'DELIVERED')
      return res.status(400).json({ message: 'Order already delivered' });

    // ডেলিভারি হলে স্টক এবং পেমেন্ট আপডেট
    if (status === 'DELIVERED') {
      if (order.payment.method === 'COD' && order.payment.status !== 'PAID') {
        order.payment.status = 'PAID';
        order.payment.paidAt = new Date();
        await updateStockAfterPayment(order);
      }
      order.deliveredAt = new Date();
    }

    order.orderStatus = status;
    await order.save();
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ৭. Update Payment Status (Admin - Manual)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await orderModel.findById(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (status === 'PAID' && order.payment.status !== 'PAID') {
      if (order.payment.method === 'COD') {
        await updateStockAfterPayment(order);
      }
      order.payment.paidAt = new Date();
    }

    order.payment.status = status;
    await order.save();

    res.json({ success: true, message: 'Payment status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};