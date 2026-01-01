import brandModel from '../models/brand.model.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';

// CREATE BRAND
export const createBrand = async (req, res) => {
  try {
    const { name, status } = req.body;

    if (!req.file) return res.status(400).json({ message: 'Brand logo/image is required' });

    // ImageKit-এ আপলোড
    const uploadedImage = await uploadFile(req.file.buffer, '/Brands');

    const slug = name.toLowerCase().split(' ').join('-');

    const brand = await brandModel.create({
      name,
      slug,
      image: {
        url: uploadedImage.url,
        fileId: uploadedImage.fileId,
      },
      status,
    });

    res.status(201).json({ success: true, message: 'Brand created!', brand });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Brand name already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL BRANDS
export const getAllBrands = async (req, res) => {
  try {
    const brands = await brandModel.find().sort({ createdAt: -1 });
    res.json({ success: true, brands });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE BRAND
export const updateBrand = async (req, res) => {
  try {
    const { name, status } = req.body;
    let updateData = { status };

    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().split(' ').join('-');
    }

    if (req.file) {
      const brand = await brandModel.findById(req.params.id);
      if (brand?.image?.fileId) await deleteFile(brand.image.fileId); // পুরনো ইমেজ ডিলিট

      const uploadedImage = await uploadFile(req.file.buffer, '/Brands');
      updateData.image = { url: uploadedImage.url, fileId: uploadedImage.fileId };
    }

    const brand = await brandModel.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    res.json({ success: true, message: 'Brand updated!', brand });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE BRAND
export const deleteBrand = async (req, res) => {
  try {
    const brand = await brandModel.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    if (brand.image?.fileId) await deleteFile(brand.image.fileId);
    await brandModel.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
