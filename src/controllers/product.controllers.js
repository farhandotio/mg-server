import productModel from '../models/product.model.js';
import { deleteFile } from '../utils/imageKit.js';
import slugify from 'slugify';

// 1. Create
// export const createProduct = async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       shortDescription,
//       price,
//       offer,
//       stock,
//       category,
//       brand,
//       affiliateLink = '',
//       sku,
//       productType,
//       tags,
//       specifications,
//       images,
//     } = req.body;

//     const isAffiliate = affiliateLink !== '';

//     // 1️⃣ Image validation
//     if (!Array.isArray(images) || images.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'অন্তত একটি প্রোডাক্ট ইমেজ আবশ্যক',
//       });
//     }

//     // 2️⃣ Safe JSON parser
//     const parseData = (data) => {
//       if (!data) return undefined;
//       if (typeof data === 'object') return data;
//       try {
//         return JSON.parse(data);
//       } catch {
//         return undefined;
//       }
//     };

//     const finalPrice = parseData(price);
//     const finalOffer = parseData(offer);
//     const finalSpecs = parseData(specifications);
//     const finalTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;

//     // 3️⃣ Required price validation
//     if (!finalPrice?.base || Number(finalPrice.base) <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'মূল দাম প্রয়োজন এবং সেটি ০-র বেশি হতে হবে',
//       });
//     }

//     // 4️⃣ Slug generate
//     const slug = slugify(title, { lower: true, strict: true });

//     // 5️⃣ Product object (NO DISCOUNT LOGIC HERE)
//     const productData = {
//       title,
//       slug,
//       description,
//       shortDescription,
//       category,
//       brand,
//       affiliateLink,
//       isAffiliate,
//       stock: Number(stock),
//       sku: sku ? sku.toUpperCase() : `SKU-${Date.now()}`,
//       productType,
//       tags: finalTags,
//       specifications: finalSpecs,
//       price: {
//         base: Number(finalPrice.base),
//       },
//       images,
//     };

//     // 6️⃣ Offer attach (optional)
//     if (finalOffer?.percentage > 0) {
//       productData.offer = {
//         percentage: Number(finalOffer.percentage),
//         deadline: finalOffer.deadline || null,
//       };
//     }

//     const product = await productModel.create(productData);

//     return res.status(201).json({
//       success: true,
//       message: 'প্রোডাক্ট সফলভাবে তৈরি হয়েছে!',
//       product,
//     });
//   } catch (err) {
//     if (err.code === 11000) {
//       const field = Object.keys(err.keyValue)[0];
//       return res.status(400).json({
//         success: false,
//         message: `${field.toUpperCase()} already exists.`,
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export const createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      price,
      deadline,
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

    // ১. ইমেজ ভ্যালিডেশন
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'অন্তত একটি প্রোডাক্ট ইমেজ আবশ্যক',
      });
    }

    // ২. সেফ ডাটা পার্সার (যদি স্ট্রিং হিসেবে আসে)
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
    const finalSpecs = parseData(specifications);
    const finalTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;

    // ৩. প্রাইস ভ্যালিডেশন
    if (!finalPrice?.base || Number(finalPrice.base) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'মূল দাম প্রয়োজন এবং সেটি ০-র বেশি হতে হবে',
      });
    }

    // ৪. স্লাগ জেনারেট
    const slug = slugify(title, { lower: true, strict: true });

    // ৫. প্রোডাক্ট ডাটা প্রিপেয়ার
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
        discounted: finalPrice.discounted ? Number(finalPrice.discounted) : Number(finalPrice.base),
      },
      offer: {
        deadline: deadline || null, // ডেডলাইন সেভ হচ্ছে
        // percentage এখানে পাঠানোর দরকার নেই, Schema-র pre-save থেকে ক্যালকুলেট হবে
      },
      images,
    };

    const product = await productModel.create(productData);

    return res.status(201).json({
      success: true,
      message: 'প্রোডাক্ট সফলভাবে তৈরি হয়েছে!',
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
      isAdmin, // ফ্রন্টএন্ড থেকে অ্যাডমিন প্যানেলের জন্য এটি পাঠাবেন
      'price.base[lte]': maxPrice,
    } = req.query;

    let query = isAdmin === 'true' ? {} : { status: 'Published' };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
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
    res.status(500).json({ success: false, message: 'ভল্ট অ্যাক্সেস প্রত্যাখ্যাত' });
  }
};

// ৩. GET SINGLE PRODUCT (SEO Friendly Slug)
export const getProductBySlug = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .populate('category', 'name')
      .populate('brand', 'name');

    if (!product) return res.status(404).json({ success: false, message: 'প্রোডাক্ট পাওয়া যায়নি' });

    product.views += 1;
    await product.save();

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি হয়েছে' });
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
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি হয়েছে' });
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
    res.status(500).json({ success: false, message: 'অনুসন্ধান ব্যর্থ হয়েছে' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    let product = await productModel.findById(productId);

    if (!product) return res.status(404).json({ success: false, message: 'প্রোডাক্ট পাওয়া যায়নি' });

    let updateData = { ...req.body };

    // ১. স্লাগ আপডেট
    if (req.body.title) {
      updateData.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    // ২. স্মার্ট ডাটা পার্সিং (সেফটি)
    const parseData = (data) => {
      if (!data) return undefined;
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        return data;
      }
    };

    if (req.body.price) updateData.price = parseData(req.body.price);

    // ৩. অফার ডেডলাইন হ্যান্ডলিং
    if (req.body.deadline !== undefined) {
      updateData.offer = {
        ...product.offer?.toObject(),
        deadline: req.body.deadline || null,
      };
    }

    // ৪. ডিসকাউন্ট রি-ক্যালকুলেশন (Pre-save schema লজিকের সাথে সামঞ্জস্য রেখে)
    // এখানে আমরা শুধু ডাটা পাস করবো, স্কিমা অটো পার্সেন্টেজ বের করে নিবে
    if (updateData.price) {
      updateData.price.base = Number(updateData.price.base);
      updateData.price.discounted = Number(updateData.price.discounted);
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'প্রোডাক্ট সফলভাবে আপডেট হয়েছে!',
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
    res.json({ success: true, message: 'অবস্থা আপডেট হয়েছে!', product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'আপডেট ব্যর্থ হয়েছে' });
  }
};

// ৮. DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'প্রোডাক্ট পাওয়া যায়নি' });

    await Promise.all(product.images.map((img) => deleteFile(img.fileId)));
    await productModel.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'প্রোডাক্ট সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি হয়েছে' });
  }
};
