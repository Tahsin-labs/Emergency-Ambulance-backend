import streamifier from 'streamifier';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { AppError } from './AppError';

/**
 * Uploads a file buffer to Cloudinary using an upload stream.
 * @param buffer - File Buffer from multer
 * @param folder - Target folder in Cloudinary
 * @returns UploadApiResponse with secure_url, public_id, etc.
 */
export const uploadBuffer = async (
  buffer: Buffer,
  folder: string,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(
            new AppError(500, `Cloudinary upload failed: ${error.message}`),
          );
        }
        if (!result) {
          return reject(new AppError(500, 'Cloudinary upload returned empty response'));
        }
        resolve(result);
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Deletes a file from Cloudinary given its secure URL.
 * Extracts the public_id and destroys the asset.
 * @param url - Cloudinary secure URL
 */
export const deleteByUrl = async (url?: string | null): Promise<void> => {
  if (!url || !url.includes('cloudinary.com')) return;

  try {
    // URL format: https://res.cloudinary.com/<cloud>/image/upload/v1234567890/folder/subfolder/public_id.ext
    const parts = url.split('/upload/');
    if (parts.length < 2) return;

    // Remove version prefix (e.g., v1234567890/)
    const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
    // Remove file extension
    const publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.'));

    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error: any) {
    console.error('Failed to delete old asset from Cloudinary:', error?.message || error);
    // Non-blocking, but log the failure
  }
};
