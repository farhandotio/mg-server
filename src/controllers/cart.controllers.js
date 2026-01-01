import cartModel from '../models/cart.model.js';
import productModel from '../models/product.model.js';

// ১. কার্টে আইটেম যোগ করা (Add/Update)
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity, sessionId } = req.body;
    const userId = req.user?._id || null;

    // ১. প্রোডাক্ট ভ্যালিডেশন
    const product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // ২. কার্ট খুঁজে বের করা (User ID থাকলে সেটা প্রাধান্য পাবে)
    let cart = await cartModel.findOne({
      $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
    });

    if (cart) {
      // ৩. প্রোডাক্ট অলরেডি কার্টে আছে কি না চেক করা
      const itemIndex = cart.items.findIndex((p) => p.product.toString() === productId);

      if (itemIndex > -1) {
        // পরিমাণ বাড়ানো
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].price = product.price.discounted; // লেটেস্ট প্রাইস আপডেট
      } else {
        // নতুন আইটেম পুশ করা
        cart.items.push({
          product: productId,
          quantity,
          price: product.price.discounted,
        });
      }

      // ৪. গেস্ট থেকে লগইন ইউজারে ট্রান্সফার করা (যদি প্রযোজ্য হয়)
      if (userId && !cart.user) {
        cart.user = userId;
      }

      await cart.save();
    } else {
      // ৫. একদম নতুন কার্ট তৈরি
      cart = await cartModel.create({
        user: userId,
        sessionId,
        items: [{ product: productId, quantity, price: product.price.discounted }],
      });
    }

    res.status(200).json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ২. কার্ট দেখা (Get Cart Details)
export const getCart = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.user?._id || null;

    const cart = await cartModel
      .findOne({
        $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
      })
      .populate('items.product', 'title images slug price');

    if (!cart) {
      return res
        .status(200)
        .json({ success: true, cart: { items: [], totalPrice: 0, totalItems: 0 } });
    }

    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
};

// ৩. কার্ট থেকে আইটেম রিমুভ করা
export const removeFromCart = async (req, res) => {
  try {
    const { productId, sessionId } = req.body;
    const userId = req.user?._id || null;

    let cart = await cartModel.findOne({
      $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
    });

    if (cart) {
      cart.items = cart.items.filter((item) => item.product.toString() !== productId);
      await cart.save();
    }

    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

// ৪. কার্ট মার্জ করা (লগইন হওয়ার পর কল করতে হবে)
export const mergeCart = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;

    // গেস্ট এবং ইউজার কার্ট প্যারালালি খোঁজা (Performance optimize)
    const [guestCart, userCart] = await Promise.all([
      cartModel.findOne({ sessionId, user: null }),
      cartModel.findOne({ user: userId }),
    ]);

    if (!guestCart) {
      return res.json({ success: true, cart: userCart, message: 'No guest cart to merge' });
    }

    if (!userCart) {
      // যদি ইউজারের আগের কোনো কার্ট না থাকে, গেস্ট কার্টকেই ইউজারের বানিয়ে দিন
      guestCart.user = userId;
      await guestCart.save();
      return res.json({ success: true, cart: guestCart });
    }

    // দুই কার্ট মার্জ করার লজিক
    guestCart.items.forEach((gItem) => {
      const existingItem = userCart.items.find(
        (uItem) => uItem.product.toString() === gItem.product.toString()
      );

      if (existingItem) {
        existingItem.quantity += gItem.quantity;
      } else {
        userCart.items.push(gItem);
      }
    });

    await userCart.save();
    await cartModel.findByIdAndDelete(guestCart._id);

    res.json({ success: true, cart: userCart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Merge failed' });
  }
};
