import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    shortDescription: {
      type: String,
      maxlength: [500, 'Short description cannot exceed 500 characters'],
    },
    // Relationships
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Brand is required'],
    },
    // Pricing
    price: {
      base: { type: Number, required: true, min: 0 },
      discounted: { type: Number, min: 0 },
    },
    offer: {
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      deadline: { type: Date, default: null },
    },
    // Inventory & Tracking
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: 0,
      default: 1,
    },
    sku: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      required: [true, 'SKU is required for inventory management'],
    },
    // Media (Multiple images)
    images: [
      {
        url: { type: String, required: true },
        fileId: { type: String, required: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    // Professional Product Types
    productType: {
      type: String,
      enum: ['Regular', 'FlashSale', 'HotDeals', 'Featured', 'BestSeller', 'NewArrival'],
      default: 'Regular',
    },
    // Real-time Status Control
    status: {
      type: String,
      enum: ['Draft', 'Published', 'OutOfStock', 'Archived'],
      default: 'Published',
    },
    // Data tracking
    sold: { type: Number, default: 0 },
    views: { type: Number, default: 0 }, // কতজন দেখেছে (Popularity track)

    // Specifications (Dynamic - like Color, RAM, Size)
    specifications: [
      {
        key: String, // e.g., "Color"
        value: String, // e.g., "Midnight Black"
      },
    ],
    // Search Optimization
    tags: [{ type: String, trim: true }],
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// High-speed search index
productSchema.index({ title: 'text', tags: 'text', sku: 'text' });

productSchema.pre('save', function (next) {
  // ১. ক্যালকুলেট ডিসকাউন্ট (যদি বেস প্রাইস থাকে)
  if (this.price && this.price.base) {
    if (this.offer && this.offer.percentage > 0) {
      this.price.discounted = Math.round(
        this.price.base - (this.price.base * this.offer.percentage) / 100
      );
    } else {
      this.price.discounted = this.price.base;
    }
  }

  // ২. অটোমেটিক স্ট্যাটাস আপডেট
  if (this.stock <= 0) {
    this.status = 'OutOfStock';
  } else if (this.status === 'OutOfStock' && this.stock > 0) {
    // স্টক ফিরে আসলে অটোমেটিক পাবলিশ করা (ঐচ্ছিক)
    this.status = 'Published';
  }

  next();
});

const productModel = mongoose.model('Product', productSchema);
export default productModel;
