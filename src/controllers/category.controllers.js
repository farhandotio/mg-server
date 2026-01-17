import categoryModel from '../models/category.model.js';
import { deleteFile } from '../utils/imageKit.js';

// ১. CREATE CATEGORY
export const createCategory = async (req, res) => {
  try {
    const { name, status, image } = req.body;

    // ইমেজ চেক (অবজেক্ট এবং ইউআরএল নিশ্চিত করা)
    if (!image || !image.url) {
      return res.status(400).json({ message: 'Category image URL is required' });
    }

    const slug = name.toLowerCase().split(' ').join('-');

    const category = await categoryModel.create({
      name,
      slug,
      image, // { url, fileId } format
      status: status || 'ACTIVE',
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
    let updateData = {};

    if (status) updateData.status = status;
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().split(' ').join('-');
    }

    // ইমেজ আপডেট লজিক
    if (image && image.url) {
      const category = await categoryModel.findById(req.params.id);

      if (!category) return res.status(404).json({ message: 'Category not found' });

      // যদি নতুন ইমেজ ইউআরএল পুরনো ইউআরএল থেকে আলাদা হয়
      if (image.url !== category.image?.url) {
        // যদি পুরনো ইমেজের fileId থাকে এবং নতুন ইমেজ আসে, তবে পুরনো ফাইল ডিলিট হবে
        if (category.image?.fileId && image.fileId) {
          try {
            await deleteFile(category.image.fileId);
          } catch (error) {
            console.log('ImageKit delete failed, continuing update...');
          }
        }

        updateData.image = image;
      }
    }

    const updatedCategory = await categoryModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

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

    // ইমেজকিট থেকে ফাইল রিমুভ করা
    if (category.image && category.image.fileId) {
      try {
        await deleteFile(category.image.fileId);
      } catch (error) {
        console.log('Image delete error during category deletion');
      }
    }

    await categoryModel.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Category removed from terminal' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ৪. GET ALL CATEGORIES
export const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find().sort({ createdAt: -1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
