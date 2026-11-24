import streamifier from 'streamifier';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { AppError } from './AppError';
import { env } from '../config/env';

export const isCloudinaryConfigured = (): boolean => {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
};

export const uploadBuffer = async (
  buffer: Buffer,
  folder: string,
): Promise<UploadApiResponse> => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(503, 'Cloudinary upload service is currently unavailable or unconfigured on this server.');
  }

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

export const deleteByUrl = async (url?: string | null): Promise<void> => {
  if (!url || !url.includes('cloudinary.com') || !isCloudinaryConfigured()) return;

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return;

    const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
    const publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.'));

    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error: any) {
    console.error('Failed to delete old asset from Cloudinary:', error?.message || error);
  }
};
