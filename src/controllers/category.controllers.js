import categoryModel from '../models/category.model.js';
import { deleteFile } from '../utils/imageKit.js'; 

// ১. CREATE CATEGORY
export const createCategory = async (req, res) => {
  try {
    const { name, status, image } = req.body;

    if (!image || !image.url) {
      return res.status(400).json({ message: 'Category image is required' });
    }

    const slug = name.toLowerCase().split(' ').join('-');

    const category = await categoryModel.create({
      name,
      slug,
      image, 
      status,
    });

    res.status(201).json({ success: true, message: 'Category created!', category });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'Category name already exists' });
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ২. UPDATE CATEGORY
export const updateCategory = async (req, res) => {
  try {
    const { name, status, image } = req.body;
    let updateData = { status };

    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().split(' ').join('-');
    }

    // যদি ফ্রন্টেন্ড থেকে নতুন ইমেজ পাঠানো হয়
    if (image && image.fileId) {
      const category = await categoryModel.findById(req.params.id);

      // পুরনো ইমেজ ডিলিট করা
      if (category?.image?.fileId) {
        await deleteFile(category.image.fileId);
      }

      updateData.image = image; 
    }

    const updatedCategory = await categoryModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCategory) return res.status(404).json({ message: 'Category not found' });

    res.json({ success: true, message: 'Category updated!', category: updatedCategory });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ৩. DELETE CATEGORY
export const deleteCategory = async (req, res) => {
  try {
    const category = await categoryModel.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (category.image && category.image.fileId) {
      await deleteFile(category.image.fileId);
    }

    await categoryModel.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ৪. GET ALL CATEGORIES (এটি একই থাকবে)
export const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find().sort({ createdAt: -1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
