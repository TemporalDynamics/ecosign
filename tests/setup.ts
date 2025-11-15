// tests/setup.ts
import { vi } from 'vitest';

// Configurar variables de entorno para pruebas
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing';
process.env.NDA_ENCRYPTION_KEY = process.env.NDA_ENCRYPTION_KEY || 
  'f71310d30ff9246406a67562a95d02dc67cfda39888ba2965e33453e8ed2bf6f';

// Mock de Supabase Client si es necesario
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ data: [], error: null })),
        insert: vi.fn(() => ({ data: [], error: null })),
        update: vi.fn(() => ({ data: [], error: null })),
        delete: vi.fn(() => ({ data: [], error: null }))
      })),
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn()
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => ({ data: {}, error: null })),
          download: vi.fn(() => ({ data: {}, error: null })),
          remove: vi.fn(() => ({ data: {}, error: null }))
        }))
      }
    }))
  };
});

// Mock de window y File para pruebas en Node
if (typeof window === 'undefined') {
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