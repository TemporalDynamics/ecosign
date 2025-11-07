import CryptoJS from 'crypto-js';

export interface EcoMetadata {
  schemaVersion: string;
  documentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  sha256Hash: string;
  timestamp: string;
  userEmail: string;
  blockchainAnchor?: {
    transactionId: string;
    network: string;
    blockNumber?: number;
  };
  signature?: {
    algorithm: string;
    publicKey: string;
    signedHash: string;
  };
}

export interface EcoFile {
  metadata: EcoMetadata;
  proof: {
    hash: string;
    timestamp: number;
    nonce: string;
  };
}

export class CryptoService {
  static async calculateSHA256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(buffer as any);
    return CryptoJS.SHA256(wordArray).toString();
  }

  static calculateSHA256FromBase64(base64Content: string): string {
    const wordArray = CryptoJS.enc.Base64.parse(base64Content);
    return CryptoJS.SHA256(wordArray).toString();
  }

  static generateNonce(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  static async createEcoMetadata(
    file: File,
    email: string,
    documentId: string
  ): Promise<EcoMetadata> {
    const hash = await this.calculateSHA256(file);
    const timestamp = new Date().toISOString();

    return {
      schemaVersion: '1.0.0',
      documentId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      sha256Hash: hash,
      timestamp,
      userEmail: email,
    };
  }

  static async createEcoFile(metadata: EcoMetadata): Promise<EcoFile> {
    const nonce = this.generateNonce();
    const proofHash = CryptoJS.SHA256(
      metadata.sha256Hash + metadata.timestamp + nonce
    ).toString();

    return {
      metadata,
      proof: {
        hash: proofHash,
        timestamp: Date.now(),
        nonce,
      },
    };
  }

  static verifyEcoFile(ecoFile: EcoFile): boolean {
    const { metadata, proof } = ecoFile;
    const recomputedHash = CryptoJS.SHA256(
      metadata.sha256Hash + metadata.timestamp + proof.nonce
    ).toString();

    return recomputedHash === proof.hash;
  }

  static async verifyFileAgainstEco(file: File, ecoFile: EcoFile): Promise<boolean> {
    const currentHash = await this.calculateSHA256(file);
    return currentHash === ecoFile.metadata.sha256Hash;
  }

  static downloadEcoFile(ecoFile: EcoFile, fileName: string): void {
    const jsonString = JSON.stringify(ecoFile, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.eco.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default CryptoService;
