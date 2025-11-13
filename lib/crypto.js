// lib/crypto.js
import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';

/**
 * Generates a new Ed25519 key pair
 * Returns keys as hex strings
 */
export async function generateKeys() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
  };
}

/**
 * Get public key from private key
 * @param {string} privateKeyHex - Private key as hex string
 * @returns {Promise<string>} Public key as hex string
 */
export async function getPublicKey(privateKeyHex) {
    const privateKeyBytes = hexToBytes(privateKeyHex);
    const publicKey = await ed.getPublicKeyAsync(privateKeyBytes);
    return bytesToHex(publicKey);
}

/**
 * Calculates SHA-256 hash
 * @param {Uint8Array} data - Data to hash
 * @returns {string} Hex string
 */
export function calculateSHA256(data) {
  const hash = sha256(data);
  return bytesToHex(hash);
}

/**
 * Signs a message with Ed25519
 * @param {string} message - Message to sign
 * @param {string} privateKeyHex - Private key as hex string
 * @returns {Promise<string>} Signature as hex string
 */
export async function signMessage(message, privateKeyHex) {
  const messageBytes = utf8ToBytes(message);
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const signature = await ed.signAsync(messageBytes, privateKeyBytes);
  return bytesToHex(signature);
}
