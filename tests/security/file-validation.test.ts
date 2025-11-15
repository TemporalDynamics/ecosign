// tests/security/file-validation.test.ts

import { describe, it, expect } from 'vitest';
import { validateFile } from './utils/fileValidation.ts';

// Polyfill for File constructor if running in Node environment for tests
if (typeof File === 'undefined') {
  global.File = class MockFile extends Blob {
    name: string;
    lastModified: number;

    constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
      super(bits, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  } as any;
}

describe('File Validation Tests', () => {
  it('Acepta PDF válido', async () => {
    const pdfMagicBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const file = new File([pdfMagicBytes, 'Fake PDF content'], 'test.pdf', { type: 'application/pdf' });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
  });

  it('Rechaza archivo vacío', async () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('vacío');
  });

  it('Rechaza archivo demasiado grande', async () => {
    const largeContent = new Uint8Array(101 * 1024 * 1024); // 101 MB
    const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('grande');
  });

  it('Rechaza extensión no permitida', async () => {
    const file = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('no está permitido');
  });

  it('Rechaza MIME type que no coincide con extensión (con algunas excepciones)', async () => {
    // Archivo .pdf pero con MIME type de imagen
    const file = new File(['fake'], 'fake.pdf', { type: 'image/png' });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('no coincide');
  });

  it('Acepta MIME type application/octet-stream como fallback', async () => {
    const pdfMagicBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const file = new File([pdfMagicBytes, 'content'], 'test.pdf', { type: 'application/octet-stream' });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
  });

  it('Detecta magic bytes incorrectos (archivo disfrazado)', async () => {
    // Crear un "PDF" falso con magic bytes de PNG
    const pngMagicBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG signature
    const file = new File([pngMagicBytes, 'fake pdf content'], 'fake.pdf', { 
      type: 'application/pdf' 
    });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('corrupto o disfrazado');
  });

  it('Acepta imagen JPEG válida', async () => {
    const jpegMagicBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const file = new File([jpegMagicBytes, 'image data...'], 'photo.jpg', { 
      type: 'image/jpeg' 
    });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
  });

  it('Acepta archivo .ECO válido', async () => {
    const ecoMagicBytes = new Uint8Array([0x45, 0x43, 0x4f, 0x53]); // ECOS
    const file = new File([ecoMagicBytes, 'eco content...'], 'my-doc.eco', { 
      type: 'application/octet-stream' 
    });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
  });

  it('Acepta archivo .ECOX válido', async () => {
    const ecoxMagicBytes = new Uint8Array([0x45, 0x43, 0x4f, 0x58]); // ECOX
    const file = new File([ecoxMagicBytes, 'ecox content...'], 'my-legal-doc.ecox', { 
      type: 'application/octet-stream' 
    });
    
    const result = await validateFile(file);
    expect(result.valid).toBe(true);
  });
});
