import cartModel from '../models/cart.model.js';
import productModel from '../models/product.model.js';

// ১. কার্টে আইটেম যোগ করা (Add/Update)
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity, sessionId } = req.body;
    const userId = req.user?._id || null;

    const product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let cart = await cartModel.findOne({
      $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
    });

    if (cart) {
      const itemIndex = cart.items.findIndex((p) => p.product.toString() === productId);

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += Number(quantity);
        cart.items[itemIndex].price = product.price.discounted;
      } else {
        cart.items.push({
          product: productId,
          quantity: Number(quantity),
          price: product.price.discounted,
        });
      }

      if (userId && !cart.user) cart.user = userId;
      await cart.save();
    } else {
      cart = await cartModel.create({
        user: userId,
        sessionId,
        items: [
          { product: productId, quantity: Number(quantity), price: product.price.discounted },
        ],
      });
    }

    // ফিক্স: রেসপন্স পাঠানোর আগে পপুলেট করা হয়েছে
    const populatedCart = await cart.populate(
      'items.product',
      'title images slug price brand stock'
    );
    res.status(200).json({ success: true, cart: populatedCart });
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

      // ফিক্স: রিমুভ করার পরেও বাকি আইটেমগুলো পপুলেট করতে হবে
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

    // ফিক্স: মার্জ হওয়ার পর পপুলেট করা হয়েছে
    await resultCart.populate('items.product', 'title images slug price brand stock');
    res.json({ success: true, cart: resultCart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Merge failed' });
  }
};
