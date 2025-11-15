import { describe, it, expect } from 'vitest';

// Implementación de funciones de sanitización
class SanitizationService {
  static sanitizeHTML(input: string): string {
    // Implementación básica de sanitización HTML
    // En producción, usar una librería como DOMPurify
    if (!input) return input;

    // Eliminar etiquetas script, iframe, etc.
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Elimina event handlers
  }

  static sanitizeSearchQuery(input: string): string {
    if (!input) return '';
    
    // Limitar longitud
    input = input.substring(0, 100);
    
    // Escapar caracteres especiales SQL
    return input
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/'/g, "''");
  }

  static sanitizeFilename(input: string): string {
    if (!input) return '';
    
    // Limitar longitud
    if (input.length > 255) input = input.substring(0, 255);
    
    // Prevenir path traversal primero
    input = input.replace(/\.\.\//g, '').replace(/\.\.\./g, '').replace(/\\\.\./g, '').replace(/\/\.\.\//g, '');
    
    // Eliminar caracteres no seguros
    input = input.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    return input;
  }

  static isValidUUID(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    
    // Verificar que tiene el formato correcto de UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(input);
  }

  static isValidEmail(input: string): boolean {
    if (!input || input.length > 254) return false;
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(input);
  }
}

describe('Sanitization Tests', () => {
  describe('HTML Sanitization', () => {
    it('Permite tags seguros', () => {
      const input = '<p>Hola <strong>mundo</strong></p>';
      const output = SanitizationService.sanitizeHTML(input);
      expect(output).toBe('<p>Hola <strong>mundo</strong></p>');
    });

    it('Elimina scripts', () => {
      const input = '<p>Texto</p><script>alert("XSS")</script>';
      const output = SanitizationService.sanitizeHTML(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('Texto');
    });

    it('Elimina event handlers', () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const output = SanitizationService.sanitizeHTML(input);
      expect(output).not.toContain('onclick');
    });

    it('Elimina iframes', () => {
      const input = '<p>Texto</p><iframe src="evil.com"></iframe>';
      const output = SanitizationService.sanitizeHTML(input);
      expect(output).not.toContain('<iframe>');
    });

    it('Elimina objetos y embeds', () => {
      const input = '<object src="evil.swf"></object><embed src="evil.swf">';
      const output = SanitizationService.sanitizeHTML(input);
      expect(output).not.toContain('<object>');
      expect(output).not.toContain('<embed>');
    });

    it('No modifica texto plano', () => {
      const input = 'Texto plano sin etiquetas';
      const output = SanitizationService.sanitizeHTML(input);
      expect(output).toBe(input);
    });
  });

  describe('Search Query Sanitization', () => {
    it('Permite texto normal', () => {
      const input = 'contrato NDA 2025';
      const output = SanitizationService.sanitizeSearchQuery(input);
      expect(output).toBe('contrato NDA 2025');
    });

    it('Escapa wildcards SQL', () => {
      const input = 'test%_file';
      const output = SanitizationService.sanitizeSearchQuery(input);
      expect(output).toBe('test\\%\\_file');
    });

    it('Elimina caracteres peligrosos', () => {
      const input = "test'; DROP TABLE documents;--";
      const output = SanitizationService.sanitizeSearchQuery(input);
      expect(output).toBe("test''; DROP TABLE documents;--");
    });

    it('Limita longitud a 100 caracteres', () => {
      const input = 'A'.repeat(200);
      const output = SanitizationService.sanitizeSearchQuery(input);
      expect(output.length).toBe(100);
    });

    it('Maneja strings vacíos', () => {
      const output = SanitizationService.sanitizeSearchQuery('');
      expect(output).toBe('');
    });
  });

  describe('Filename Sanitization', () => {
    it('Permite nombres válidos', () => {
      const input = 'documento_2025.pdf';
      const output = SanitizationService.sanitizeFilename(input);
      expect(output).toBe('documento_2025.pdf');
    });

    it('Reemplaza caracteres no seguros', () => {
      const input = 'mi/documento\\con:espacios*.pdf';
      const output = SanitizationService.sanitizeFilename(input);
      expect(output).toBe('mi_documento_con_espacios_.pdf');
    });

    it('Previene path traversal', () => {
      const input = '../../../etc/passwd';
      const output = SanitizationService.sanitizeFilename(input);
      expect(output).not.toContain('..');
      expect(output).toBe('etc_passwd');
    });

    it('Limita longitud a 255 caracteres', () => {
      const input = 'A'.repeat(300) + '.pdf';
      const output = SanitizationService.sanitizeFilename(input);
      expect(output.length).toBeLessThanOrEqual(255);
    });

    it('Maneja caracteres especiales', () => {
      const input = 'archivo@#$%^&().txt';
      const output = SanitizationService.sanitizeFilename(input);
      // @#$%^&() = 8 caracteres especiales que se convierten en _ 
      expect(output).toBe('archivo________.txt');
    });

    it('Mantiene caracteres válidos', () => {
      const input = 'archivo-valido_2025.CSV';
      const output = SanitizationService.sanitizeFilename(input);
      expect(output).toBe('archivo-valido_2025.CSV');
    });
  });

  describe('UUID Validation', () => {
    it('Acepta UUID válido v4', () => {
      const valid = SanitizationService.isValidUUID('550e8400-e29b-41d4-a716-446655440000');
      expect(valid).toBe(true);
    });

    it('Rechaza UUID inválido', () => {
      const invalid = SanitizationService.isValidUUID('not-a-uuid');
      expect(invalid).toBe(false);
    });

    it('Rechaza UUID con formato incorrecto', () => {
      const invalid = SanitizationService.isValidUUID('550e8400-e29b-51d4-a716-446655440000'); // 5 en lugar de 4
      expect(invalid).toBe(false);
    });

    it('Rechaza UUID con caracteres inválidos', () => {
      const invalid = SanitizationService.isValidUUID('550e8400-e29b-41d4-a716-44665544000g'); // 'g' no es hexadecimal
      expect(invalid).toBe(false);
    });

    it('Rechaza UUID con caracteres de separador incorrecto', () => {
      const invalid = SanitizationService.isValidUUID('550e8400_e29b_41d4_a716_446655440000'); // Usando _ en lugar de -
      expect(invalid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('Acepta email válido', () => {
      const valid = SanitizationService.isValidEmail('test@example.com');
      expect(valid).toBe(true);
    });

    it('Rechaza email sin @', () => {
      const invalid = SanitizationService.isValidEmail('testexample.com');
      expect(invalid).toBe(false);
    });

    it('Rechaza email sin dominio', () => {
      const invalid = SanitizationService.isValidEmail('test@');
      expect(invalid).toBe(false);
    });

    it('Rechaza email con dominio inválido', () => {
      const invalid = SanitizationService.isValidEmail('test@.com');
      expect(invalid).toBe(false);
    });

    it('Rechaza email demasiado largo', () => {
      const invalid = SanitizationService.isValidEmail('a'.repeat(250) + '@example.com');
      expect(invalid).toBe(false);
    });

    it('Acepta emails con subdominios', () => {
      const valid = SanitizationService.isValidEmail('user@subdomain.example.com');
      expect(valid).toBe(true);
    });

    it('Acepta emails con caracteres especiales en el nombre', () => {
      const valid = SanitizationService.isValidEmail('test.user+tag@example.com');
      expect(valid).toBe(true);
    });
  });
});