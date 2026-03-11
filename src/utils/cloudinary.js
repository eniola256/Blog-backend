import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a base64 data URI or a file path to Cloudinary.
 * Returns the secure HTTPS URL.
 */
export const uploadImage = async (value, folder = 'blog') => {
  if (!value) return null;
  // Already a remote URL — nothing to do
  if (value.startsWith('http')) return value;

  const result = await cloudinary.uploader.upload(value, {
    folder,
    resource_type: 'image',
  });

  return result.secure_url;
};

/**
 * Deletes an image from Cloudinary by its public ID.
 * The public ID is the path segment after the cloud name, e.g. "blog/abc123"
 */
export const deleteImage = async (url) => {
  if (!url || !url.includes('cloudinary')) return;
  // Extract public_id from URL: …/upload/v123456/<publicId>.ext
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
  if (match) {
    await cloudinary.uploader.destroy(match[1]);
  }
};