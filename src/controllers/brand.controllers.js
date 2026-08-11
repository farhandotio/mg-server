import brandModel from '../models/brand.model.js';
import { deleteFile } from '../utils/imageKit.js';

// ১. CREATE BRAND
export const createBrand = async (req, res) => {
  try {
    const { name, status, image } = req.body;

    if (!image || !image.url) {
      return res.status(400).json({ message: 'ব্র্যান্ড লোগো/ইমেজ URL আবশ্যক' });
    }

    const slug = name.toLowerCase().split(' ').join('-');

    const brand = await brandModel.create({
      name,
      slug,
      image, // Expecting { url, fileId }
      status: status || 'ACTIVE',
    });

    res.status(201).json({ success: true, message: 'ব্র্যান্ড সফলভাবে তৈরি হয়েছে!', brand });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'ব্র্যান্ড ইতিমধ্যেই আছে' });
    res.status(500).json({ message: err.message || 'সার্ভার ত্রুটি হয়েছে' });
  }
};

// ২. UPDATE BRAND
export const updateBrand = async (req, res) => {
  try {
    const { name, status, image } = req.body;
    let updateData = {};

    if (status) updateData.status = status;
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().split(' ').join('-');
    }

    // ইমেজ আপডেট লজিক (URL ভিত্তিক আপডেট সাপোর্ট করে)
    if (image && image.url) {
      const brand = await brandModel.findById(req.params.id);
      if (!brand) return res.status(404).json({ message: 'ব্র্যান্ড পাওয়া যায়নি' });

      // যদি নতুন ইউআরএল পুরনো ইউআরএল থেকে আলাদা হয়
      if (image.url !== brand.image?.url) {
        // নতুন ইমেজে fileId থাকলে এবং পুরনোটাতেও থাকলে তবেই ডিলিট হবে (ImageKit Integration)
        if (brand.image?.fileId && image.fileId) {
          try {
            await deleteFile(brand.image.fileId);
          } catch (error) {
            console.log('ImageKit file cleanup skipped or failed.');
          }
        }
        updateData.image = image;
      }
    }

    const updatedBrand = await brandModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'ব্র্যান্ড সফলভাবে আপডেট হয়েছে!', brand: updatedBrand });
  } catch (err) {
    res.status(500).json({ message: err.message || 'সার্ভার ত্রুটি হয়েছে' });
  }
};

// ৩. DELETE BRAND
export const deleteBrand = async (req, res) => {
  try {
    const brand = await brandModel.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: 'ব্র্যান্ড পাওয়া যায়নি' });

    // ইমেজকিট থেকে ফাইল ক্লিনআপ
    if (brand.image?.fileId) {
      try {
        await deleteFile(brand.image.fileId);
      } catch (error) {
        console.log('Cleanup failed during deletion.');
      }
    }

    await brandModel.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'ব্র্যান্ড সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'সার্ভার ত্রুটি হয়েছে' });
  }
};

// ৪. GET ALL BRANDS
export const getAllBrands = async (req, res) => {
  try {
    const brands = await brandModel.find().sort({ createdAt: -1 });
    res.json({ success: true, brands });
  } catch (err) {
    res.status(500).json({ message: 'অভ্যন্তরীণ সার্ভার ত্রুটি' });
  }
};
