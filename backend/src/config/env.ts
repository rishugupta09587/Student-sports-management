import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 5000),
  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/sports_staff_db'),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
  },
};

export const isCloudinaryConfigured = (): boolean =>
  Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
