import streamifier from 'streamifier';
import { cloudinary } from '../config/cloudinary';
import { isCloudinaryConfigured } from '../config/env';
import { ApiError } from '../utils/ApiError';

interface UploadResult {
  url: string;
  publicId: string;
}

export function isStorageConfigured(): boolean {
  return isCloudinaryConfigured();
}

export function uploadBuffer(buffer: Buffer, folder: string, resourceType: 'image' | 'raw' = 'image'): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    return Promise.reject(ApiError.internal('Cloudinary storage is not configured on this server'));
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `sports-staff/${folder}`, resource_type: resourceType },
      (error, result) => {
        if (error || !result) {
          reject(ApiError.internal(`Upload failed: ${error?.message ?? 'unknown error'}`));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

export async function deleteAsset(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
  if (!isCloudinaryConfigured() || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
