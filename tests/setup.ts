import dotenv from 'dotenv';
import path from 'path';
import { vi } from 'vitest';

// Load relevant .env files (root first, client overrides)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'client', '.env') });

// --- Smart Environment Variable Mapping ---
// The .env file in /client uses VITE_ prefixes. We map them to the names
// the test suite expects (without prefixes) for consistency.
if (process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}
if (process.env.VITE_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}

if (process.env.VITE_SERVICE_ROL_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SERVICE_ROL_KEY;
}

// --- Environment Variable Validation ---
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  throw new Error(
    `ERROR: Missing required environment variables for security tests: ${missingVars.join(', ')}. ` +
    `Please provide them in your .env file or test environment.`
  );
}

// --- Global Mocks / Polyfills ---
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing-csrf-32-bytes';
process.env.NDA_ENCRYPTION_KEY = process.env.NDA_ENCRYPTION_KEY || 
  'f71310d30ff9246406a67562a95d02dc67cfda39888ba2965e33453e8ed2bf6f';

if (typeof File === 'undefined') {
  global.File = class MockFile extends Blob {
    name: string;
    lastModified: number;
    
    constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options?.lastModified || Date.now();
    }
  } as any;
  
  global.Blob = Blob;
}
