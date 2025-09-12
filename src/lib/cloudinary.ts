import { v2 as cloudinary } from 'cloudinary';
import type { CloudinaryUploadResult } from '../types';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

/**
 * Upload an image to Cloudinary
 * @param imageUrl URL of the image to upload
 * @returns Cloudinary URL of the uploaded image
 */
export async function uploadToCloudinary(imageUrl: string): Promise<string> {
  try {
    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'mememe',
      transformation: [
        { width: 800, crop: 'scale' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    }) as CloudinaryUploadResult;

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

export default cloudinary;