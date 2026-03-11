import { v2 as cloudinary } from 'cloudinary';

const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
};

export const uploadImage = async (value, folder = 'blog') => {
  if (!value) return null;
  if (value.startsWith('http')) return value;

  const result = await getCloudinary().uploader.upload(value, {
    folder,
    resource_type: 'image',
  });

  return result.secure_url;
};

export const deleteImage = async (url) => {
  if (!url || !url.includes('cloudinary')) return;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
  if (match) {
    await getCloudinary().uploader.destroy(match[1]);
  }
};