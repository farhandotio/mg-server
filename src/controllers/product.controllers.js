import productModel from '../models/product.model.js';
import { deleteFile } from '../utils/imageKit.js';
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
      affiliateLink = '',
      sku,
      productType,
      tags,
      specifications,
      images,
    } = req.body;

    const isAffiliate = affiliateLink !== '';

    // 1️⃣ Image validation
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required',
      });
    }

    // 2️⃣ Safe JSON parser
    const parseData = (data) => {
      if (!data) return undefined;
      if (typeof data === 'object') return data;
      try {
        return JSON.parse(data);
      } catch {
        return undefined;
      }
    };

    const finalPrice = parseData(price);
    const finalOffer = parseData(offer);
    const finalSpecs = parseData(specifications);
    const finalTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;

    // 3️⃣ Required price validation
    if (!finalPrice?.base || Number(finalPrice.base) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Base price is required and must be greater than 0',
      });
    }

    // 4️⃣ Slug generate
    const slug = slugify(title, { lower: true, strict: true });

    // 5️⃣ Product object (NO DISCOUNT LOGIC HERE)
    const productData = {
      title,
      slug,
      description,
      shortDescription,
      category,
      brand,
      affiliateLink,
      isAffiliate,
      stock: Number(stock),
      sku: sku ? sku.toUpperCase() : `SKU-${Date.now()}`,
      productType,
      tags: finalTags,
      specifications: finalSpecs,
      price: {
        base: Number(finalPrice.base),
      },
      images,
    };

    // 6️⃣ Offer attach (optional)
    if (finalOffer?.percentage > 0) {
      productData.offer = {
        percentage: Number(finalOffer.percentage),
        deadline: finalOffer.deadline || null,
      };
    }

    const product = await productModel.create(productData);

    return res.status(201).json({
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

    return res.status(500).json({
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
      productType,
      'price.base[lte]': maxPrice,
    } = req.query;

    let query = { status: 'Published' };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (productType) query.productType = productType;

    if (maxPrice) {
      query['price.base'] = { $lte: Number(maxPrice) };
    }

    let sortQuery = { createdAt: -1 };
    if (sort) {
      if (sort === 'price.base') sortQuery = { 'price.base': 1 };
      else if (sort === '-price.base') sortQuery = { 'price.base': -1 };
      else if (sort === '-sold') sortQuery = { sold: -1 };
      else sortQuery = { [sort]: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, totalProducts] = await Promise.all([
      productModel
        .find(query)
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .sort(sortQuery)
        .limit(Number(limit))
        .skip(skip),
      productModel.countDocuments(query),
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        totalProducts,
        totalPages: Math.ceil(totalProducts / Number(limit)),
        currentPage: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error('Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Vault Access Denied!' });
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

export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    let product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let updateData = { ...req.body };

    // ১. টাইটেল চেঞ্জ হলে স্লাগ আপডেট
    if (req.body.title) {
      updateData.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    // ২. স্মার্ট ডাটা পার্সিং (সেফটি চেক)
    const parseData = (data) => {
      if (!data) return undefined;
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        return data;
      }
    };

    if (req.body.price) updateData.price = parseData(req.body.price);
    if (req.body.offer) updateData.offer = parseData(req.body.offer);
    if (req.body.specifications) updateData.specifications = parseData(req.body.specifications);

    // ৩. ইমেজ আপডেট লজিক (Client-side থেকে images আসলে)
    // images: [ {url, fileId, isPrimary}, ... ]
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      // পুরনো ইমেজগুলো ImageKit থেকে ডিলিট করা (যদি নতুন ইমেজ সেট করা হয়)
      if (product.images && product.images.length > 0) {
        const deletePromises = product.images.map((img) => deleteFile(img.fileId));
        await Promise.all(deletePromises);
      }

      // নতুন ইমেজ সেট করা (যা ফ্রন্টেন্ড থেকে এসেছে)
      updateData.images = req.body.images;
    }

    // ৪. ডিসকাউন্টেড প্রাইস রি-ক্যালকুলেশন (যদি প্রাইস বা অফার আপডেট হয়)
    if (updateData.price || updateData.offer) {
      const basePrice = updateData.price?.base || product.price.base;
      const offerPercent = updateData.offer?.percentage || product.offer?.percentage || 0;

      updateData.price = {
        ...updateData.price,
        base: basePrice,
        discounted: Math.round(basePrice - (basePrice * offerPercent) / 100),
      };
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully!',
      product: updatedProduct,
    });
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
