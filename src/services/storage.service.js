import ImageKit from 'imagekit';
import { v4 as uuidv4 } from 'uuid';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});


export const uploadFile = async (fileBuffer, folder = '/DigitalHat') => {
  try {
    if (!fileBuffer) throw new Error('No file buffer provided');

    const fileName = `${uuidv4()}-${Date.now()}.jpg`;

    const res = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: true,
    });

    return {
      url: res.url,
      fileId: res.fileId, 
      thumbnail: res.thumbnailUrl || res.url,
    };
  } catch (error) {
    console.error('ImageKit Upload Error:', error.message);
    throw new Error('Failed to upload image to cloud storage');
  }
};


export const deleteFile = async (fileId) => {
  try {
    if (!fileId) return;
    await imagekit.deleteFile(fileId);
    return { success: true };
  } catch (error) {
    console.error('ImageKit Delete Error:', error.message);
  }
};
