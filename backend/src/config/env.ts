import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_ACCESS_EXPIRES: z.string().default('1d'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SSL_STORE_ID: z.string().optional(),
  SSL_STORE_PASSWORD: z.string().optional(),
  SSL_IS_LIVE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  BACKEND_URL: z.string().default('http://localhost:5000'),
  CLIENT_SUCCESS_URL: z.string().optional(),
  CLIENT_FAIL_URL: z.string().optional(),
  CLIENT_CANCEL_URL: z.string().optional(),
  ADMIN_EMAIL: z.string().email().default('admin@ambulance.com'),
  ADMIN_PASSWORD: z.string().default('Admin@123456'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
