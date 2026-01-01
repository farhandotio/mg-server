import categoryModel from '../models/category.model.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';

// CREATE CATEGORY (Admin Only)
export const createCategory = async (req, res) => {
  try {
    const { name, status } = req.body;

    // ১. চেক করা ফাইল আছে কিনা (Multer req.file এ ডাটা দেয়)
    if (!req.file) {
      return res.status(400).json({ message: 'Category image is required' });
    }

    // ২. ইমেজকিটে আপলোড করা
    const uploadedImage = await uploadFile(req.file.buffer, '/Categories');

    const slug = name.toLowerCase().split(' ').join('-');

    // ৩. ডাটাবেসে সেভ
    const category = await categoryModel.create({
      name,
      slug,
      image: {
        url: uploadedImage.url,
        fileId: uploadedImage.fileId,
      },
      status,
    });

    res.status(201).json({ success: true, message: 'Category created!', category });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'Category name already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL CATEGORIES
export const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find().sort({ createdAt: -1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE CATEGORY (Admin Only)
export const updateCategory = async (req, res) => {
  try {
    const { name, status } = req.body;
    let updateData = { status };

    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().split(' ').join('-');
    }

    // যদি নতুন ইমেজ আপলোড করা হয়
    if (req.file) {
      const category = await categoryModel.findById(req.params.id);
      if (category?.image?.fileId) {
        await deleteFile(category.image.fileId); // পুরনো ইমেজ ডিলিট
      }
      const uploadedImage = await uploadFile(req.file.buffer, '/Categories'); // নতুন ইমেজ আপলোড
      updateData.image = {
        url: uploadedImage.url,
        fileId: uploadedImage.fileId,
      };
    }

    const updatedCategory = await categoryModel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!updatedCategory) return res.status(404).json({ message: 'Category not found' });

    res.json({ success: true, message: 'Category updated!', category: updatedCategory });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE CATEGORY (Admin Only)
export const deleteCategory = async (req, res) => {
  try {
    const category = await categoryModel.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // ১. ইমেজকিট থেকে ইমেজ ডিলিট করা
    if (category.image && category.image.fileId) {
      await deleteFile(category.image.fileId);
    }

    // ২. ডাটাবেস থেকে ক্যাটাগরি ডিলিট করা
    await categoryModel.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
