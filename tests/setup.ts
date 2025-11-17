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
  console.warn(
    `WARNING: Missing required environment variables for security tests: ${missingVars.join(', ')}. ` +
    `Some tests may be skipped in mocked mode.`
  );

  // Provide fallback values for tests that don't require real Supabase connection
  if (!process.env.SUPABASE_URL) {
    process.env.SUPABASE_URL = 'http://localhost:54321';
  }
  if (!process.env.SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
  }
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

// --- Mock Supabase Client for tests that need it but don't require real connection ---
// This allows tests to run even without real Supabase connection
vi.mock('@supabase/supabase-js', async () => {
  const actual = await import('@supabase/supabase-js');

  // Create a mock Supabase client that simulates basic behavior
  const mockSupabaseClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        remove: vi.fn(() => Promise.resolve({ error: null })),
        createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'http://test.com/test.pdf' }, error: null })),
      })),
      getBucket: vi.fn(() => Promise.resolve({ data: { public: false }, error: null }))
    },
    auth: {
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null }))
    }
  };

  return {
    ...actual,
    createClient: vi.fn(() => mockSupabaseClient)
  };
});

// --- Common test utilities ---
// Provide utilities to conditionally run tests that require real connections
global.skipIfRealSupabaseNotAvailable = () => {
  const requiresRealConnection = !process.env.SUPABASE_URL?.includes('localhost') &&
                                  !process.env.SUPABASE_URL?.includes('127.0.0.1');

  return requiresRealConnection ? 'skip' : 'run';
};
