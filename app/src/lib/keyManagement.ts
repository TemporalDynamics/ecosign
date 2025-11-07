import CryptoJS from 'crypto-js';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  created: string;
  version: number;
}

export interface KeyRotationPolicy {
  maxAgeMs: number;
  rotationSchedule: 'daily' | 'weekly' | 'monthly' | 'manual';
  retainOldKeys: boolean;
  maxOldKeysCount: number;
}

export class KeyManagementService {
  private static readonly KEY_STORAGE_PREFIX = 'verifysign_key_';
  private static readonly ACTIVE_KEY_VERSION = 'verifysign_active_key_version';
  private static readonly DEFAULT_ROTATION_POLICY: KeyRotationPolicy = {
    maxAgeMs: 90 * 24 * 60 * 60 * 1000,
    rotationSchedule: 'monthly',
    retainOldKeys: true,
    maxOldKeysCount: 3,
  };

  static generateKeyPair(version: number): KeyPair {
    const privateKey = CryptoJS.lib.WordArray.random(32).toString();
    const publicKey = CryptoJS.SHA256(privateKey).toString();

    return {
      publicKey,
      privateKey,
      created: new Date().toISOString(),
      version,
    };
  }

  static storeKeyPair(keyPair: KeyPair, isActive: boolean = true): void {
    try {
      const encrypted = this.encryptKeyPair(keyPair);
      const storageKey = `${this.KEY_STORAGE_PREFIX}${keyPair.version}`;

      localStorage.setItem(storageKey, encrypted);

      if (isActive) {
        localStorage.setItem(this.ACTIVE_KEY_VERSION, keyPair.version.toString());
      }

      console.log(`Key pair version ${keyPair.version} stored successfully`);
    } catch (error) {
      console.error('Error storing key pair:', error);
      throw new Error('Failed to store key pair');
    }
  }

  static getActiveKeyPair(): KeyPair | null {
    try {
      const activeVersion = localStorage.getItem(this.ACTIVE_KEY_VERSION);
      if (!activeVersion) {
        return null;
      }

      const storageKey = `${this.KEY_STORAGE_PREFIX}${activeVersion}`;
      const encrypted = localStorage.getItem(storageKey);

      if (!encrypted) {
        return null;
      }

      return this.decryptKeyPair(encrypted);
    } catch (error) {
      console.error('Error retrieving active key pair:', error);
      return null;
    }
  }

  static rotateKeys(policy: KeyRotationPolicy = this.DEFAULT_ROTATION_POLICY): KeyPair {
    const currentKeyPair = this.getActiveKeyPair();
    const newVersion = currentKeyPair ? currentKeyPair.version + 1 : 1;

    const newKeyPair = this.generateKeyPair(newVersion);
    this.storeKeyPair(newKeyPair, true);

    if (currentKeyPair && policy.retainOldKeys) {
      this.cleanupOldKeys(policy.maxOldKeysCount);
    } else if (currentKeyPair && !policy.retainOldKeys) {
      this.revokeKeyPair(currentKeyPair.version);
    }

    console.log(`Keys rotated successfully. New version: ${newVersion}`);
    return newKeyPair;
  }

  static shouldRotateKeys(policy: KeyRotationPolicy = this.DEFAULT_ROTATION_POLICY): boolean {
    const activeKeyPair = this.getActiveKeyPair();

    if (!activeKeyPair) {
      return true;
    }

    const keyAge = Date.now() - new Date(activeKeyPair.created).getTime();
    return keyAge > policy.maxAgeMs;
  }

  static cleanupOldKeys(maxKeysToRetain: number): void {
    try {
      const allKeys = this.getAllKeyVersions();
      const activeVersion = parseInt(localStorage.getItem(this.ACTIVE_KEY_VERSION) || '0', 10);

      const oldKeys = allKeys
        .filter((v) => v !== activeVersion)
        .sort((a, b) => b - a);

      const keysToRemove = oldKeys.slice(maxKeysToRetain);

      keysToRemove.forEach((version) => {
        this.revokeKeyPair(version);
      });

      console.log(`Cleaned up ${keysToRemove.length} old key(s)`);
    } catch (error) {
      console.error('Error cleaning up old keys:', error);
    }
  }

  static revokeKeyPair(version: number): void {
    const storageKey = `${this.KEY_STORAGE_PREFIX}${version}`;
    localStorage.removeItem(storageKey);
    console.log(`Key pair version ${version} revoked`);
  }

  static getAllKeyVersions(): number[] {
    const versions: number[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.KEY_STORAGE_PREFIX)) {
        const version = parseInt(key.replace(this.KEY_STORAGE_PREFIX, ''), 10);
        if (!isNaN(version)) {
          versions.push(version);
        }
      }
    }

    return versions.sort((a, b) => a - b);
  }

  static initializeKeys(): KeyPair {
    let activeKeyPair = this.getActiveKeyPair();

    if (!activeKeyPair) {
      console.log('No active key pair found. Generating initial keys...');
      activeKeyPair = this.generateKeyPair(1);
      this.storeKeyPair(activeKeyPair, true);
    }

    return activeKeyPair;
  }

  static exportKeyPairForBackup(keyPair: KeyPair): string {
    const backup = {
      ...keyPair,
      exportedAt: new Date().toISOString(),
      fingerprint: CryptoJS.SHA256(keyPair.publicKey + keyPair.privateKey).toString(),
    };

    return btoa(JSON.stringify(backup));
  }

  static importKeyPairFromBackup(backupString: string): KeyPair {
    try {
      const backup = JSON.parse(atob(backupString));

      const expectedFingerprint = CryptoJS.SHA256(
        backup.publicKey + backup.privateKey
      ).toString();

      if (backup.fingerprint !== expectedFingerprint) {
        throw new Error('Backup integrity check failed');
      }

      return {
        publicKey: backup.publicKey,
        privateKey: backup.privateKey,
        created: backup.created,
        version: backup.version,
      };
    } catch (error) {
      console.error('Error importing key pair:', error);
      throw new Error('Failed to import key pair from backup');
    }
  }

  private static encryptKeyPair(keyPair: KeyPair): string {
    const masterKey = this.getMasterKey();
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(keyPair), masterKey).toString();
    return encrypted;
  }

  private static decryptKeyPair(encrypted: string): KeyPair {
    const masterKey = this.getMasterKey();
    const decrypted = CryptoJS.AES.decrypt(encrypted, masterKey).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  }

  private static getMasterKey(): string {
    const userAgent = navigator.userAgent;
    const timestamp = Date.now().toString().slice(0, -6);
    return CryptoJS.SHA256(userAgent + timestamp + 'verifysign_v1').toString();
  }

  static getKeyMetadata(): {
    activeVersion: number | null;
    totalKeys: number;
    keyVersions: number[];
    activeKeyAge: number | null;
  } {
    const activeVersion = localStorage.getItem(this.ACTIVE_KEY_VERSION);
    const versions = this.getAllKeyVersions();
    const activeKeyPair = this.getActiveKeyPair();

    let activeKeyAge = null;
    if (activeKeyPair) {
      activeKeyAge = Date.now() - new Date(activeKeyPair.created).getTime();
    }

    return {
      activeVersion: activeVersion ? parseInt(activeVersion, 10) : null,
      totalKeys: versions.length,
      keyVersions: versions,
      activeKeyAge,
    };
  }
}

export default KeyManagementService;
