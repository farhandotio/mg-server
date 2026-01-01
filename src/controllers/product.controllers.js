import productModel from '../models/product.model.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';
import slugify from 'slugify';

// ১. CREATE PRODUCT (Admin Only)
export const createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price, // এটি সরাসরি অবজেক্ট হতে পারে যদি ডাটা ঠিকভাবে পাঠানো হয়
      stock,
      category,
      brand,
      sku,
      productType,
      tags,
      specifications,
    } = req.body;

    // ১. ইমেজ চেক
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'At least one product image is required' });
    }

    // ২. ইমেজকিটে আপলোড
    const uploadPromises = req.files.map((file) => uploadFile(file.buffer, '/Products'));
    const uploadResults = await Promise.all(uploadPromises);

    const images = uploadResults.map((img, index) => ({
      url: img.url,
      fileId: img.fileId,
      isPrimary: index === 0,
    }));

    const slug = slugify(title, { lower: true, strict: true });

    // ৩. প্রাইস হ্যান্ডলিং (ভেরি ভেরি ইম্পর্ট্যান্ট ফিক্স)
    // যদি আপনি পোস্টম্যানে price.base কি হিসেবে পাঠান, তবে req.body.price.base কাজ করবে না।
    // সেরা উপায় হলো 'price' নামে কি পাঠানো এবং ভ্যালুতে {"base": 120, "original": 150} দেওয়া।

    let finalPrice = {};
    try {
      finalPrice = typeof price === 'string' ? JSON.parse(price) : price;
    } catch (e) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid price format. Send JSON string.' });
    }

    const product = await productModel.create({
      title,
      slug,
      description,
      category,
      brand,
      stock,
      sku,
      productType,
      tags,
      specifications,
      price: finalPrice, // সরাসরি পার্স করা অবজেক্ট বসিয়ে দিন
      images,
    });

    res.status(201).json({ success: true, message: 'Product created successfully!', product });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'SKU or Title already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ২. GET ALL PRODUCTS (Public - With Filtering)
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, brand, sort } = req.query;
    let query = { status: 'Published' };

    if (category) query.category = category;
    if (brand) query.brand = brand;

    const products = await productModel
      .find(query)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort(sort ? { [sort]: 1 } : { createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await productModel.countDocuments(query);
    res.json({ success: true, total, page, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ৩. GET SINGLE PRODUCT (SEO Friendly Slug)
export const getProductBySlug = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .populate('category', 'name')
      .populate('brand', 'name');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.views += 1; // Popularity track
    await product.save();

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ৪. RELATED PRODUCTS
export const getRelatedProducts = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const products = await productModel
      .find({
        category: categoryId,
        status: 'Published',
      })
      .limit(4)
      .select('title price images slug');

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ৫. SEARCH PRODUCTS (Full Text Search)
export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    const products = await productModel
      .find({ $text: { $search: q }, status: 'Published' }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(10);

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

// ৬. UPDATE PRODUCT (Complex Logic)
export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    let product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    let updateData = { ...req.body };

    // ১. টাইটেল চেঞ্জ হলে স্লাগ আপডেট
    if (req.body.title) {
      updateData.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    // ২. প্রাইস যদি স্ট্রিং হিসেবে আসে তবে পার্স করা
    if (req.body.price) {
      updateData.price =
        typeof req.body.price === 'string' ? JSON.parse(req.body.price) : req.body.price;
    }

    // ৩. ইমেজ আপডেট লজিক
    if (req.files && req.files.length > 0) {
      // পুরনো ইমেজ ডিলিট (পুরানো images array থেকে fileId নিয়ে)
      if (product.images && product.images.length > 0) {
        await Promise.all(product.images.map((img) => deleteFile(img.fileId)));
      }

      const uploadResults = await Promise.all(
        req.files.map((file) => uploadFile(file.buffer, '/Products'))
      );
      updateData.images = uploadResults.map((img, index) => ({
        url: img.url,
        fileId: img.fileId,
        isPrimary: index === 0,
      }));
    }

    const updatedProduct = await productModel.findByIdAndUpdate(productId, updateData, {
      new: true,
      runValidators: true, // ভ্যালিডেশন চেক করার জন্য
    });

    res.json({ success: true, message: 'Product updated!', product: updatedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ৭. UPDATE STATUS ONLY
export const updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const product = await productModel.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, message: 'Status updated!', product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// ৮. DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await Promise.all(product.images.map((img) => deleteFile(img.fileId)));
    await productModel.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
