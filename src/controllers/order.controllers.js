import orderModel from '../models/order.model.js';
import cartModel from '../models/cart.model.js';
import productModel from '../models/product.model.js';

/** ==================== USER CONTROLLERS ==================== **/

// ১. Create Order (Checkout)
export const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    // ইউজারের কার্ট খুঁজে বের করা
    const cart = await cartModel.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // ডেলিভারি চার্জ নির্ধারণ (উদাহরণ: ঢাকা ৮০, ঢাকার বাইরে ১৫০)
    const shippingPrice = shippingAddress.city.toLowerCase() === 'dhaka' ? 80 : 150;
    const totalPrice = cart.totalPrice + shippingPrice;

    // অর্ডার আইটেম ফরম্যাট করা
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      title: item.product.title,
      quantity: item.quantity,
      price: item.price,
      image: item.product.images[0].url,
    }));

    // অর্ডার তৈরি
    const order = await orderModel.create({
      user: userId,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: cart.totalPrice,
      shippingPrice,
      totalPrice,
      paymentStatus: 'Pending',
    });

    // ইনভেন্টরি আপডেট (Stock কমানো এবং Sold বাড়ানো)
    const updateStock = cart.items.map((item) => {
      return productModel.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity, sold: item.quantity },
      });
    });
    await Promise.all(updateStock);

    // কার্ট ক্লিয়ার করা
    await cartModel.findByIdAndDelete(cart._id);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      orderId: order._id,
      totalAmount: totalPrice,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ২. Get My Orders
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
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // সিকিউরিটি চেক: অর্ডারটি কি এই ইউজারেরই?
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching details' });
  }
};

// ৪. Cancel Order (User)
export const cancelOrder = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.orderStatus !== 'Processing') {
      return res
        .status(400)
        .json({ message: 'Cannot cancel an order that is already shipped or delivered' });
    }

    order.orderStatus = 'Cancelled';
    await order.save();

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cancellation failed' });
  }
};

/** ==================== ADMIN CONTROLLERS ==================== **/

// ৫. Get All Orders (Admin)
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await orderModel
      .find()
      .populate('user', 'name phoneNumber')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Admin access error' });
  }
};

// ৬. Update Order Status (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await orderModel.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = status;
    if (status === 'Delivered') {
      order.deliveredAt = Date.now();
      order.paymentStatus = 'Paid'; // ডেলিভারি হলে অটো পেইড ধরে নেওয়া যায় (COD এর ক্ষেত্রে)
    }

    await order.save();
    res.json({ success: true, message: `Order updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Status update failed' });
  }
};

// ৭. Update Payment Status (Admin)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await orderModel.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: status },
      { new: true }
    );
    res.json({ success: true, message: 'Payment status updated', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Payment update failed' });
  }
};
