import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to find the .env file in the current directory or two levels up (project root)
const paths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '../../.env'),
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../../.env'),
];

for (const envPath of paths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
        break;
    }
}

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),
    DATABASE_URL: process.env.DATABASE_URL || '',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || '',
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
};

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
