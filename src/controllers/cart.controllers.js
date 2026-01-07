import cartModel from '../models/cart.model.js';
import productModel from '../models/product.model.js';

/**
 * ১. addToCart: নতুন আইটেম যোগ করা অথবা বিদ্যমান আইটেমের কোয়ান্টিটি আপডেট করা
 * কোয়ান্টিটি পজিটিভ (১) হলে বাড়বে, নেগেটিভ (-১) হলে কমবে।
 */
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity, sessionId } = req.body;
    const userId = req.user?._id || null;
    const qtyChange = Number(quantity) || 0;

    // প্রোডাক্ট চেক
    const product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // কার্ট খোঁজা
    let cart = await cartModel.findOne({
      $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
    });

    if (!cart) {
      // কার্ট না থাকলে এবং কোয়ান্টিটি পজিটিভ হলে নতুন কার্ট তৈরি
      if (qtyChange > 0) {
        cart = await cartModel.create({
          user: userId,
          sessionId,
          items: [
            {
              product: productId,
              quantity: qtyChange,
              price: product.price.discounted || product.price.regular || product.price,
            },
          ],
        });
      } else {
        return res.status(400).json({ success: false, message: 'Invalid quantity for new cart' });
      }
    } else {
      // কার্ট থাকলে আইটেম চেক
      const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

      if (itemIndex > -1) {
        // আইটেম থাকলে কোয়ান্টিটি যোগ/বিয়োগ
        const newQty = cart.items[itemIndex].quantity + qtyChange;

        if (newQty <= 0) {
          cart.items.splice(itemIndex, 1); // ০ বা কম হলে রিমুভ
        } else {
          // স্টক চেক
          if (newQty > product.stock) {
            return res
              .status(400)
              .json({ success: false, message: `Only ${product.stock} units available` });
          }
          cart.items[itemIndex].quantity = newQty;
        }
      } else if (qtyChange > 0) {
        // নতুন আইটেম পুশ
        cart.items.push({
          product: productId,
          quantity: qtyChange,
          price: product.price.discounted || product.price.regular || product.price,
        });
      }

      if (userId && !cart.user) cart.user = userId;
      await cart.save();
    }

    const populatedCart = await cartModel
      .findById(cart._id)
      .populate('items.product', 'title images slug price brand stock');

    res.status(200).json({ success: true, cart: populatedCart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * ২. updateCartQuantity: সরাসরি ইনক্রিজ বা ডিক্রিজ অ্যাকশন হ্যান্ডেল করা
 */
export const updateCartQuantity = async (req, res) => {
  try {
    const { productId, action, sessionId } = req.body; // action: 'increase' or 'decrease'
    const userId = req.user?._id || null;

    let cart = await cartModel.findOne({
      $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
    });

    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
    if (itemIndex === -1)
      return res.status(404).json({ success: false, message: 'Item not in cart' });

    const product = await productModel.findById(productId);

    if (action === 'increase') {
      if (cart.items[itemIndex].quantity + 1 > product.stock) {
        return res.status(400).json({ success: false, message: 'Stock limit reached' });
      }
      cart.items[itemIndex].quantity += 1;
    } else if (action === 'decrease') {
      if (cart.items[itemIndex].quantity > 1) {
        cart.items[itemIndex].quantity -= 1;
      } else {
        cart.items.splice(itemIndex, 1); // ১ এর নিচে গেলে রিমুভ
      }
    }

    await cart.save();
    const updatedCart = await cartModel
      .findById(cart._id)
      .populate('items.product', 'title images slug price brand stock');

    res.status(200).json({ success: true, cart: updatedCart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- ৩. গেট কার্ট, ৪. রিমুভ, ৫. মার্জ (আপনার আগের কোডটি ঠিক আছে, শুধু পপুলেশন নিশ্চিত করুন) ---
export const getCart = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.user?._id || null;

    const cart = await cartModel
      .findOne({
        $or: [{ user: userId, user: { $ne: null } }, { sessionId: sessionId }],
      })
      .populate('items.product', 'title images slug price brand stock');

    res.status(200).json({ success: true, cart: cart || { items: [] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
};

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
    res.status(500).json({ success: false, message: 'Remove failed' });
  }
};

export const mergeCart = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;

    const [guestCart, userCart] = await Promise.all([
      cartModel.findOne({ sessionId, user: null }),
      cartModel.findOne({ user: userId }),
    ]);

    if (!guestCart) return res.json({ success: true, cart: userCart });

    let finalCart = userCart || new cartModel({ user: userId, items: [] });

    guestCart.items.forEach((gItem) => {
      const existing = finalCart.items.find(
        (u) => u.product.toString() === gItem.product.toString()
      );
      if (existing) existing.quantity += gItem.quantity;
      else finalCart.items.push(gItem);
    });

    await finalCart.save();
    await cartModel.findByIdAndDelete(guestCart._id);
    await finalCart.populate('items.product', 'title images slug price brand stock');

    res.json({ success: true, cart: finalCart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Merge failed' });
  }
};
