import { describe, expect, it } from 'vitest';
import { pack, unpack } from '../index';
import type { EcoManifest } from '../unpacker';
import { generateEd25519KeyPair, sha256Hex } from '../eco-utils';
import { Project } from '@vista/timeline-engine';

const createTestProject = (): Project => ({
  id: 'project_123',
  name: 'My Test Project',
  assets: { // Assets should be an object, not an array, as per timeline-engine's Project type
    'asset_1': {
      id: 'asset_1',
      mediaType: 'video',
      fileName: 'clip1.mp4',
      originalFileName: 'clip1.mp4', // Added
      src: 'memory://clip1.mp4',     // Added
      duration: 10,
      width: 1920,
      height: 1080,
      createdAt: new Date('2025-10-31T09:50:00Z').getTime(), // Added
    },
    'asset_2': {
      id: 'asset_2',
      mediaType: 'audio',
      fileName: 'music.mp3',
      originalFileName: 'music.mp3', // Added
      src: 'memory://music.mp3',     // Added
      duration: 180,
      createdAt: new Date('2025-10-31T09:55:00Z').getTime(), // Added
    },
  },
  timeline: [
    {
      id: 'segment_1',
      assetId: 'asset_1',
      projectStartTime: 0,
      startTime: 0,
      endTime: 5,
      speed: 1,
    },
  ],
  createdAt: new Date('2025-10-31T10:00:00Z').getTime(),
  updatedAt: new Date('2025-10-31T10:00:00Z').getTime(), // Added for completeness
  version: '1.0.0', // Added for completeness
});

describe('ECO Packer Roundtrip', () => {
  it('should pack and unpack a project successfully, with valid signature', async () => {
    // 1. Setup
    const project = createTestProject();
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const keyId = 'test-key-1';

    // Mock asset hashes
    const assetHashes = new Map<string, string>();
    assetHashes.set('asset_1', sha256Hex('video content'));
    assetHashes.set('asset_2', sha256Hex('audio content'));

    // 2. Pack the project
    const ecoBuffer = await pack(project, assetHashes, { privateKey, keyId });
    expect(ecoBuffer).toBeInstanceOf(ArrayBuffer);

    // 3. Unpack the project
    const unpackedProject = await unpack(ecoBuffer, { publicKey }) as EcoManifest;

    // 4. Verify
    expect(unpackedProject.projectId).toEqual(project.id);
    expect(unpackedProject.title).toEqual(project.name);
    expect(unpackedProject.assets.length).toEqual(Object.keys(project.assets).length);
    expect(unpackedProject.assets[0].sha256).toEqual(assetHashes.get('asset_1'));
    expect(unpackedProject.segments[0].id).toEqual(project.timeline[0].id);
    expect(unpackedProject.signatures).toBeDefined();
    expect(unpackedProject.signatures.length).toBe(1);
    expect(unpackedProject.signatures[0].keyId).toBe(keyId);
  });

  it('should reject pack if any asset hash is missing', async () => {
    const project = createTestProject();
    const { privateKey } = generateEd25519KeyPair();

    const assetHashes = new Map<string, string>();
    assetHashes.set('asset_1', sha256Hex('video content'));
    // asset_2 missing on purpose

    await expect(pack(project, assetHashes, { privateKey, keyId: 'missing-hash-key' }))
      .rejects
      .toThrow('Missing SHA256 hash for asset "asset_2".');
  });

  it('should reject pack if an asset hash has invalid format', async () => {
    const project = createTestProject();
    const { privateKey } = generateEd25519KeyPair();

    const assetHashes = new Map<string, string>();
    assetHashes.set('asset_1', 'INVALID_HASH');
    assetHashes.set('asset_2', sha256Hex('audio content'));

    await expect(pack(project, assetHashes, { privateKey, keyId: 'invalid-hash-key' }))
      .rejects
      .toThrow('Invalid SHA256 hash for asset "asset_1".');
  });

  it('should fail to unpack if the public key is incorrect', async () => {
    // 1. Setup
    const project = createTestProject();
    const { privateKey } = generateEd25519KeyPair(); // Real key pair
    const { publicKey: wrongPublicKey } = generateEd25519KeyPair(); // Wrong key pair
    const keyId = 'test-key-1';
    const assetHashes = new Map<string, string>();
    assetHashes.set('asset_1', sha256Hex('video content'));
    assetHashes.set('asset_2', sha256Hex('audio content'));

    // 2. Pack
    const ecoBuffer = await pack(project, assetHashes, { privateKey, keyId });

    // 3. Unpack and Assert Failure
    await expect(unpack(ecoBuffer, { publicKey: wrongPublicKey }))
      .rejects
      .toThrow('Manifest verification failed: The project file is corrupt or has been tampered with.');
  });

  it('should fail to unpack if the blob is tampered with', async () => {
    // 1. Setup
    const project = createTestProject();
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const keyId = 'test-key-1';
    const assetHashes = new Map<string, string>();
    assetHashes.set('asset_1', sha256Hex('video content'));
    assetHashes.set('asset_2', sha256Hex('audio content'));

    // 2. Pack
    const ecoBuffer = await pack(project, assetHashes, { privateKey, keyId });

    // 3. Tamper with the buffer (flip a byte)
    const tamperedBuffer = new Uint8Array(ecoBuffer);
    tamperedBuffer[tamperedBuffer.length - 20] ^= 0xff; // Flip some bits

    // 4. Unpack and Assert Failure
    await expect(unpack(tamperedBuffer, { publicKey }))
      .rejects
      .toThrow(/Failed to read .ecox file/); // It will likely fail at the JSZip level
  });
});
