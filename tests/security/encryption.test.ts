import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// Implementación de funciones de encriptación
class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // Para GCM
  private static readonly AUTH_TAG_LENGTH = 16; // Para GCM

  static async encrypt(data: any): Promise<string> {
    const key = Buffer.from(process.env.NDA_ENCRYPTION_KEY!, 'hex');
    const iv = randomBytes(this.IV_LENGTH);
    
    // Convertir datos a string
    const text = JSON.stringify(data);
    
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Obtener el auth tag para GCM
    const authTag = cipher.getAuthTag();
    
    // Combinar IV, authTag y datos encriptados
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  static async decrypt(encryptedData: string): Promise<any> {
    const key = Buffer.from(process.env.NDA_ENCRYPTION_KEY!, 'hex');
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Formato de encriptación inválido');
    }
    
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}

describe('Encryption Tests', () => {
  const testData = {
    name: 'Juan Pérez',
    email: 'juan@example.com',
    company: 'ACME Corp',
    dni: '12345678A'
  };

  beforeAll(() => {
    // Asegurarse de que la variable de entorno está definida
    process.env.NDA_ENCRYPTION_KEY = process.env.NDA_ENCRYPTION_KEY || 
      'f71310d30ff9246406a67562a95d02dc67cfda39888ba2965e33453e8ed2bf6f';
  });

  it('Cifra y descifra datos correctamente', async () => {
    const encrypted = await EncryptionService.encrypt(testData);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(testData); // No debe contener datos en claro

    const decrypted = await EncryptionService.decrypt(encrypted);
    expect(decrypted).toEqual(testData);
  });

  it('Cifrado genera output diferente cada vez (IV aleatorio)', async () => {
    const encrypted1 = await EncryptionService.encrypt(testData);
    const encrypted2 = await EncryptionService.encrypt(testData);
    
    expect(encrypted1).not.toBe(encrypted2); // Diferentes por IV aleatorio
  });

  it('Descifrado falla con datos alterados', async () => {
    const encrypted = await EncryptionService.encrypt(testData);
    
    // Alterar un carácter en el medio
    const parts = encrypted.split(':');
    const alteredEncrypted = parts[0] + ':' + parts[1] + ':' + parts[2].slice(0, 10) + 'XX' + parts[2].slice(12);
    
    await expect(EncryptionService.decrypt(alteredEncrypted)).rejects.toThrow();
  });

  it('Cifra correctamente caracteres especiales', async () => {
    const specialData = {
      name: 'José María Öztürk',
      emoji: '🔐🎉',
      unicode: '日本語'
    };

    const encrypted = await EncryptionService.encrypt(specialData);
    const decrypted = await EncryptionService.decrypt(encrypted);
    
    expect(decrypted).toEqual(specialData);
  });

  it('Maneja objetos grandes', async () => {
    const largeData = {
      description: 'A'.repeat(1000), // 1KB de texto
      metadata: Array(50).fill({ key: 'value', number: 123 })
    };

    const encrypted = await EncryptionService.encrypt(largeData);
    const decrypted = await EncryptionService.decrypt(encrypted);
    
    expect(decrypted).toEqual(largeData);
  });

  it('Mantiene formato consistente', async () => {
    const encrypted = await EncryptionService.encrypt(testData);
    const parts = encrypted.split(':');
    
    expect(parts).toHaveLength(3); // IV:AuthTag:EncryptedData
    expect(parts[0]).toMatch(/^[0-9a-f]+$/); // IV en hex
    expect(parts[1]).toMatch(/^[0-9a-f]+$/); // AuthTag en hex
    expect(parts[2]).toMatch(/^[0-9a-f]+$/); // Datos encriptados en hex
  });

  it('Detecta formato inválido', async () => {
    await expect(EncryptionService.decrypt('invalid-format')).rejects.toThrow();
    await expect(EncryptionService.decrypt('too:many:parts:extra')).rejects.toThrow();
    await expect(EncryptionService.decrypt('')).rejects.toThrow();
  });

  it('Cifra y descifra arrays', async () => {
    const arrayData = [1, 2, 3, 'test', { nested: true }];
    
    const encrypted = await EncryptionService.encrypt(arrayData);
    const decrypted = await EncryptionService.decrypt(encrypted);
    
    expect(decrypted).toEqual(arrayData);
  });
});