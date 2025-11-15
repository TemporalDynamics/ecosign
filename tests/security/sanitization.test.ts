// tests/security/sanitization.test.ts

import { describe, it, expect } from 'vitest';
import { 
  sanitizeHTML, 
  sanitizeSearchQuery, 
  sanitizeFilename,
  isValidUUID,
  isValidEmail 
} from './utils/sanitize.ts';

describe('Sanitization Tests', () => {
  describe('HTML Sanitization', () => {
    it('Permite tags seguros', () => {
      const input = '<p>Hola <strong>mundo</strong></p>';
      const output = sanitizeHTML(input);
      expect(output).toBe('<p>Hola <strong>mundo</strong></p>');
    });

    it('Elimina scripts', () => {
      const input = '<p>Texto</p><script>alert("XSS")</script>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('<script>');
      expect(output).toBe('<p>Texto</p>');
    });

    it('Elimina event handlers', () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('onclick');
      expect(output).toBe('<p>Click me</p>');
    });

    it('Elimina iframes', () => {
      const input = '<p>Texto</p><iframe src="evil.com"></iframe>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('<iframe>');
      expect(output).toBe('<p>Texto</p>');
    });
  });

  describe('Search Query Sanitization', () => {
    it('Permite texto normal', () => {
      const input = 'contrato NDA 2025';
      const output = sanitizeSearchQuery(input);
      expect(output).toBe('contrato NDA 2025');
    });

    it('Escapa wildcards SQL-like', () => {
      const input = 'test%_file';
      const output = sanitizeSearchQuery(input);
      expect(output).toBe('test\\%\\_file');
    });

    it('Elimina caracteres peligrosos', () => {
      const input = "test'; DROP TABLE documents;--";
      const output = sanitizeSearchQuery(input);
      expect(output).not.toContain("'");
      expect(output).not.toContain('"');
      expect(output).not.toContain(';');
    });

    it('Limita longitud a 100 caracteres', () => {
      const input = 'A'.repeat(200);
      const output = sanitizeSearchQuery(input);
      expect(output.length).toBe(100);
    });
  });

  describe('Filename Sanitization', () => {
    it('Permite nombres válidos', () => {
      const input = 'documento_2025.pdf';
      const output = sanitizeFilename(input);
      expect(output).toBe('documento_2025.pdf');
    });

    it('Reemplaza caracteres no seguros', () => {
      const input = 'mi/documento\\con:espacios*.pdf';
      const output = sanitizeFilename(input);
      expect(output).toBe('mi_documento_con_espacios_.pdf');
    });

    it('Previene path traversal', () => {
      const input = '../../../etc/passwd';
      const output = sanitizeFilename(input);
      expect(output).not.toContain('..');
      expect(output).toBe('etc_passwd');
    });

    it('Limita longitud a 255 caracteres', () => {
      const input = 'A'.repeat(300) + '.pdf';
      const output = sanitizeFilename(input);
      expect(output.length).toBe(255);
    });
  });

  describe('UUID Validation', () => {
    it('Acepta UUID válido v4', () => {
      const valid = isValidUUID('550e8400-e29b-41d4-a716-446655440000');
      expect(valid).toBe(true);
    });

    it('Rechaza UUID inválido', () => {
      const invalid = isValidUUID('not-a-uuid');
      expect(invalid).toBe(false);
    });

    it('Rechaza UUID con versión incorrecta', () => {
      const invalid = isValidUUID('550e8400-e29b-51d4-a716-446655440000'); // 5 en lugar de 4
      expect(invalid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('Acepta email válido', () => {
      const valid = isValidEmail('test@example.com');
      expect(valid).toBe(true);
    });

    it('Rechaza email sin @', () => {
      const invalid = isValidEmail('testexample.com');
      expect(invalid).toBe(false);
    });

    it('Rechaza email sin dominio', () => {
      const invalid = isValidEmail('test@');
      expect(invalid).toBe(false);
    });

    it('Rechaza email demasiado largo', () => {
      const invalid = isValidEmail('a'.repeat(250) + '@example.com');
      expect(invalid).toBe(false);
    });
  });
});
