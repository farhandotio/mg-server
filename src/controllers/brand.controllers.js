import brandModel from '../models/brand.model.js';
import { deleteFile } from '../utils/imageKit.js'; // পাথ নিশ্চিত করে নিন

// ১. CREATE BRAND
export const createBrand = async (req, res) => {
  try {
    const { name, status, image } = req.body;

    if (!image || !image.url) {
      return res.status(400).json({ message: 'Brand logo/image is required' });
    }

    const slug = name.toLowerCase().split(' ').join('-');

    const brand = await brandModel.create({
      name,
      slug,
      image,
      status,
    });

    res.status(201).json({ success: true, message: 'Brand created!', brand });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Brand name already exists' });
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ২. UPDATE BRAND
export const updateBrand = async (req, res) => {
  try {
    const { name, status, image } = req.body;
    let updateData = { status };

    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().split(' ').join('-');
    }

    // যদি ফ্রন্টেন্ড থেকে নতুন ইমেজ ডাটা পাঠানো হয়
    if (image && image.fileId) {
      const brand = await brandModel.findById(req.params.id);

      // পুরনো ইমেজ ডিলিট করা
      if (brand?.image?.fileId) {
        await deleteFile(brand.image.fileId);
      }

      updateData.image = image; // নতুন ইমেজ ডাটা সেট করা
    }

    const updatedBrand = await brandModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedBrand) return res.status(404).json({ message: 'Brand not found' });

    res.json({ success: true, message: 'Brand updated!', brand: updatedBrand });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ৩. DELETE BRAND
export const deleteBrand = async (req, res) => {
  try {
    const brand = await brandModel.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    // ইমেজকিট থেকে লোগো ডিলিট করা
    if (brand.image?.fileId) {
      await deleteFile(brand.image.fileId);
    }

    await brandModel.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ৪. GET ALL BRANDS (আগের মতোই থাকবে)
export const getAllBrands = async (req, res) => {
  try {
    const brands = await brandModel.find().sort({ createdAt: -1 });
    res.json({ success: true, brands });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
