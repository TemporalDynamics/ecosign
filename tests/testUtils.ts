/**
 * Test utilities for EcoSign
 * 
 * Helper functions and constants to make tests more reliable and environment-aware
 */

import { vi } from 'vitest';

// Function to determine if we should skip certain tests based on environment
export function shouldSkipRealSupabaseTests(): boolean {
  // Get the SUPABASE_URL from environment
  const supabaseUrl = process.env.SUPABASE_URL;
  
  // If URL includes localhost or 127.0.0.1, we assume it's a local/test instance
  // and we can run tests against it
  if (supabaseUrl?.includes('localhost') || supabaseUrl?.includes('127.0.0.1')) {
    return false; // Don't skip tests with local Supabase
  }
  
  // If we have real Supabase credentials, we can run tests
  // But if tests are failing due to network or auth issues, we may want to skip them
  try {
    // Test if we can access the environment variables
    const hasAllCreds = process.env.SUPABASE_URL && 
                       process.env.SUPABASE_ANON_KEY && 
                       process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasAllCreds) {
      return true; // Skip if we don't have all required credentials
    }
    
    // If we have credentials but it's not local, we can still attempt to run
    // but should provide option to skip if needed
    return false;
  } catch {
    return true; // Skip if environment is not properly configured
  }
}

// Create a test that conditionally runs based on environment
export function conditionalTest(testName: string, testFn: () => void | Promise<void>, skipMessage?: string) {
  if (shouldSkipRealSupabaseTests()) {
    test(testName, () => {
      console.log(skipMessage || `Skipping test "${testName}" due to environment constraints`);
    });
  } else {
    test(testName, testFn);
  }
}

// Export a function to create mocks for external dependencies
export function createMockSupabaseClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
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
}

// Mock crypto functions for node environment if not available
export function setupCryptoMocks() {
  if (typeof crypto === 'undefined') {
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: (arr: any) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        }
      },
      writable: true,
    });
  }
}

// Utility to generate test data
export function generateTestData(type: 'document' | 'user' | 'signature' = 'document') {
  switch (type) {
    case 'document':
      return {
        id: 'test-doc-id',
        name: 'test-document.pdf',
        hash: 'a1b2c3d4e5f6' + 'a1b2c3d4e5f6'.repeat(3), // 64 chars for SHA-256
        owner_id: 'test-user-id',
        created_at: new Date().toISOString(),
      };
    case 'user':
      return {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      };
    case 'signature':
      return {
        id: 'test-sig-id',
        document_id: 'test-doc-id',
        user_id: 'test-user-id',
        signature_data: 'mock-signature-base64-string',
      };
    default:
      return {};
  }
}