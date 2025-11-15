import { describe, it, expect } from 'vitest';

// Simular la implementación de validación de archivos
// En una implementación real, esto estaría en un archivo como client/src/lib/fileValidation.ts

type ValidationResult = {
  valid: boolean;
  error?: string;
  size?: number;
  type?: string;
  name?: string;
};

class FileValidator {
  private static readonly MAX_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ];

  // Magic bytes para diferentes tipos de archivos
  private static readonly MAGIC_BYTES: Record<string, Uint8Array[]> = {
    'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])], // %PDF
    'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])], // PNG signature
    'image/jpeg': [
      new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]), // Standard JPEG
      new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1])  // JPEG with EXIF
    ],
    'application/zip': [new Uint8Array([0x50, 0x4B, 0x03, 0x04])] // PK header
  };

  static async validateFile(file: File): Promise<ValidationResult> {
    // Validar tamaño
    if (file.size === 0) {
      return { valid: false, error: 'Archivo vacío' };
    }

    if (file.size > this.MAX_SIZE) {
      return { valid: false, error: `Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: 100MB` };
    }

    // Validar tipo de archivo
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    // Verificar extensión permitida
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.zip'];
    if (extension && !allowedExtensions.includes(`.${extension}`)) {
      return { valid: false, error: `Tipo de archivo no permitido: .${extension}` };
    }

    // Verificar MIME type
    if (!this.ALLOWED_TYPES.includes(mimeType)) {
      return { valid: false, error: `Tipo MIME no permitido: ${mimeType}` };
    }

    // Verificar que la extensión coincida con el MIME type
    const extensionMap: Record<string, string[]> = {
      '.pdf': ['application/pdf'],
      '.png': ['image/png'],
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.txt': ['text/plain'],
      '.zip': ['application/zip', 'application/x-zip-compressed']
    };

    if (extension && extensionMap[`.${extension}`] && !extensionMap[`.${extension}`].includes(mimeType)) {
      return { valid: false, error: `La extensión .${extension} no coincide con el tipo MIME ${mimeType}` };
    }

    // Validar magic bytes (solo para ciertos tipos)
    if (this.MAGIC_BYTES[mimeType]) {
      try {
        const fileBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer.slice(0, 8)); // Leer primeros 8 bytes

        let validMagic = false;
        for (const magic of this.MAGIC_BYTES[mimeType]) {
          if (this.bytesEqual(fileBytes.slice(0, magic.length), magic)) {
            validMagic = true;
            break;
          }
        }

        if (!validMagic) {
          return { valid: false, error: 'Archivo corrupto o disfrazado detectado' };
        }
      } catch (error) {
        return { valid: false, error: 'Error al leer archivo para validación' };
      }
    }

    return {
      valid: true,
      size: file.size,
      type: mimeType,
      name: file.name
    };
  }

  private static bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

describe('File Validation Tests', () => {
  it('Acepta PDF válido', async () => {
    // Crear un archivo PDF falso con magic bytes correctos
    const pdfContent = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, // %PDF
      0x2D, 0x31, 0x2E, 0x34, // -1.4
      ...Array(100).fill(0x20) // Espacios
    ]);
    const file = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(true);
  });

  it('Rechaza archivo vacío', async () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('vacío');
  });

  it('Rechaza archivo demasiado grande', async () => {
    const largeContent = new Uint8Array(101 * 1024 * 1024); // 101 MB
    const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('grande');
  });

  it('Rechaza extensión no permitida', async () => {
    const file = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('no permitido');
  });

  it('Rechaza MIME type que no coincide con extensión', async () => {
    // Archivo .pdf pero con MIME type de imagen
    const file = new File(['fake'], 'fake.pdf', { type: 'image/png' });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('no coincide');
  });

  it('Detecta magic bytes incorrectos (archivo disfrazado)', async () => {
    // Crear un "PDF" falso con magic bytes de PNG
    const pngMagicBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG signature
    const file = new File([pngMagicBytes, 'fake pdf content'], 'fake.pdf', { 
      type: 'application/pdf' 
    });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('corrupto o disfrazado');
  });

  it('Acepta imagen JPEG válida', async () => {
    const jpegMagicBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const file = new File([jpegMagicBytes, 'image data...'], 'photo.jpg', { 
      type: 'image/jpeg' 
    });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(true);
  });

  it('Acepta ZIP válido', async () => {
    const zipMagicBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // PK header
    const file = new File([zipMagicBytes, 'zip content...'], 'archive.zip', { 
      type: 'application/zip' 
    });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(true);
  });

  it('Acepta archivo de texto', async () => {
    const file = new File(['contenido de prueba'], 'document.txt', { 
      type: 'text/plain' 
    });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(true);
  });

  it('Rechaza archivo con extensión .exe', async () => {
    const file = new File(['contenido'], 'malware.exe', { 
      type: 'application/x-msdownload' 
    });
    
    const result = await FileValidator.validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('.exe');
  });
});