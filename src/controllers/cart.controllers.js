import cartModel from '../models/cart.model.js';
import productModel from '../models/product.model.js';

// ১. কার্টে আইটেম যোগ করা (কোয়ান্টিটি বাড়ানো বা কমানো)
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity, sessionId } = req.body;
    const userId = req.user?._id || null;

    // ১. প্রোডাক্ট ভ্যালিডেশন
    const product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // ২. কার্ট খুঁজে বের করা
    let cart = await cartModel.findOne({
      $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
    });

    if (cart) {
      const itemIndex = cart.items.findIndex((p) => p.product.toString() === productId);

      if (itemIndex > -1) {
        // নতুন কোয়ান্টিটি ক্যালকুলেট করা (বর্তমান + ইনকামিং ডেল্টা)
        const newQuantity = cart.items[itemIndex].quantity + Number(quantity);

        if (newQuantity <= 0) {
          // ফিক্স: কোয়ান্টিটি ০ বা তার কম হলে আইটেমটি রিমুভ করে দাও
          cart.items.splice(itemIndex, 1);
        } else {
          // কোয়ান্টিটি আপডেট করো
          cart.items[itemIndex].quantity = newQuantity;
          cart.items[itemIndex].price = product.price.discounted;
        }
      } else {
        // যদি আইটেমটি কার্টে না থাকে এবং কোয়ান্টিটি পজিটিভ হয় তবেই যোগ করো
        if (Number(quantity) > 0) {
          cart.items.push({
            product: productId,
            quantity: Number(quantity),
            price: product.price.discounted,
          });
        }
      }

      if (userId && !cart.user) cart.user = userId;
      await cart.save();
    } else {
      // যদি কার্ট একদমই না থাকে এবং প্রথমবার আইটেম যোগ হয়
      if (Number(quantity) > 0) {
        cart = await cartModel.create({
          user: userId,
          sessionId,
          items: [
            { product: productId, quantity: Number(quantity), price: product.price.discounted },
          ],
        });
      }
    }

    // পপুলেট করে বিস্তারিত ডাটা পাঠানো (যাতে ফ্রন্টএন্ডে ইমেজ/টাইটেল থাকে)
    const populatedCart = await cart.populate(
      'items.product',
      'title images slug price brand stock'
    );
    res.status(200).json({ success: true, cart: populatedCart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ২. কার্ট দেখা
export const getCart = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.user?._id || null;

    const cart = await cartModel
      .findOne({
        $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
      })
      .populate('items.product', 'title images slug price brand stock');

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

// ৩. কার্ট থেকে আইটেম সরাসরি ডিলিট করা
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
      await cart.populate('items.product', 'title images slug price brand stock');
    }

    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

// ৪. কার্ট মার্জ করা
export const mergeCart = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;

    const [guestCart, userCart] = await Promise.all([
      cartModel.findOne({ sessionId, user: null }),
      cartModel.findOne({ user: userId }),
    ]);

    if (!guestCart) {
      const finalCart = userCart
        ? await userCart.populate('items.product', 'title images slug price brand stock')
        : null;
      return res.json({ success: true, cart: finalCart });
    }

    let resultCart;
    if (!userCart) {
      guestCart.user = userId;
      await guestCart.save();
      resultCart = guestCart;
    } else {
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
      resultCart = userCart;
    }

    await resultCart.populate('items.product', 'title images slug price brand stock');
    res.json({ success: true, cart: resultCart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Merge failed' });
  }
};
