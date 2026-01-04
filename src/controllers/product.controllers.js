import productModel from '../models/product.model.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';
import slugify from 'slugify';

// 1. Create
export const createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      price,
      offer,
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
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required',
      });
    }

    // ২. স্মার্ট ডাটা পার্সিং ফাংশন
    const parseData = (data) => {
      if (!data) return undefined;
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        return data;
      }
    };

    const finalPrice = parseData(price); // { base: 1000 }
    const finalOffer = parseData(offer); // { percentage: 20 }
    const finalSpecs = parseData(specifications);
    const finalTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;

    // ৩. ডায়নামিক ডিসকাউন্টেড প্রাইস লজিক (অ্যাডিশনাল সেফটি)
    // যদিও স্কিমাতে pre-save আছে, এখানেও আমরা নিশ্চিত করছি ডাটা ক্লিন কি না
    let discountedAmount = finalPrice?.base || 0;

    if (finalOffer && finalOffer.percentage > 0) {
      discountedAmount = Math.round(
        finalPrice.base - (finalPrice.base * finalOffer.percentage) / 100
      );
    }

    // ৪. ইমেজকিটে আপলোড
    const uploadPromises = req.files.map((file) => uploadFile(file.buffer, '/Products'));
    const uploadResults = await Promise.all(uploadPromises);

    const images = uploadResults.map((img, index) => ({
      url: img.url,
      fileId: img.fileId,
      isPrimary: index === 0,
    }));

    // ৫. স্লাগ জেনারেট
    const slug = slugify(title, { lower: true, strict: true });

    // ৬. প্রোডাক্ট অবজেক্ট তৈরি
    const productData = {
      title,
      slug,
      description,
      shortDescription,
      category,
      brand,
      stock: Number(stock),
      sku: sku.toUpperCase(),
      productType,
      tags: finalTags,
      specifications: finalSpecs,
      price: {
        base: finalPrice?.base,
        discounted: discountedAmount, // এখানে ডাইনামিক্যালি সেট হচ্ছে
      },
      images,
    };

    // যদি অফার থাকে তবেই অফার অবজেক্ট অ্যাড হবে
    if (finalOffer && finalOffer.percentage > 0) {
      productData.offer = {
        percentage: finalOffer.percentage,
        deadline: finalOffer.deadline || null,
      };
    }

    const product = await productModel.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully!',
      product,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field.toUpperCase()} already exists.`,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ২. GET ALL PRODUCTS (Public - With Filtering)
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      brand,
      sort,
      search,
      'price.base[lte]': maxPrice,
    } = req.query;

    // ১. ডিফল্ট কোয়েরি
    let query = { status: 'Published' };

    // ২. সার্চ ফিল্টার (এটি ফ্রন্টএন্ডের SearchOverlay এর জন্য কাজ করবে)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    // ৩. ক্যাটাগরি ও ব্র্যান্ড ফিল্টার
    if (category) query.category = category;
    if (brand) query.brand = brand;

    // ৪. প্রাইস ফিল্টার (আপনার শপ পেজের স্লাইডার এর জন্য)
    if (maxPrice) {
      query['price.base'] = { $lte: Number(maxPrice) };
    }

    // ৫. সর্টিং লজিক
    let sortQuery = { createdAt: -1 }; // Default: Newest
    if (sort) {
      if (sort === 'price.base') sortQuery = { 'price.base': 1 };
      else if (sort === '-price.base') sortQuery = { 'price.base': -1 };
      else if (sort === '-sold') sortQuery = { sold: -1 };
      else sortQuery = { [sort]: 1 };
    }

    const products = await productModel
      .find(query)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort(sortQuery)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await productModel.countDocuments(query);

    res.json({ success: true, total, page: Number(page), products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during fetching' });
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
    const { q, search } = req.query;
    const queryTerm = q || search; // ফ্রন্টএন্ডে 'search' আর ব্যাকএন্ডে 'q' উভয়কেই সাপোর্ট দিবে

    if (!queryTerm) {
      return res.json({ success: true, products: [] });
    }

    const products = await productModel
      .find({
        status: 'Published',
        $or: [
          { title: { $regex: queryTerm, $options: 'i' } },
          { description: { $regex: queryTerm, $options: 'i' } },
        ],
      })
      .select('title price images slug category')
      .populate('category', 'name')
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
