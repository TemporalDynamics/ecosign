#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

function usage() {
  console.log('Usage: node scripts/verify-eco.mjs <ecoFile> [originalFile]');
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isHex64(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function validateEcoStructure(eco) {
  const errors = [];
  if (!eco || typeof eco !== 'object') {
    errors.push('ECO payload is not an object.');
    return errors;
  }
  if (!eco.manifest || !eco.manifest.assets || !Array.isArray(eco.manifest.assets)) {
    errors.push('Missing manifest.assets array.');
    return errors;
  }
  const asset = eco.manifest.assets[0];
  if (!asset || !asset.hash) {
    errors.push('Missing asset hash.');
  } else if (!isHex64(asset.hash)) {
    errors.push('Asset hash is not a valid SHA-256 hex string.');
  }
  if (!eco.signatures || !Array.isArray(eco.signatures) || eco.signatures.length === 0) {
    errors.push('Missing signatures array.');
  }
  return errors;
}

const [ecoPath, originalPath] = process.argv.slice(2);
if (!ecoPath) {
  usage();
  process.exit(1);
}

const resolvedEcoPath = path.resolve(ecoPath);
const eco = readJson(resolvedEcoPath);
const errors = validateEcoStructure(eco);

if (errors.length > 0) {
  console.error('Invalid ECO structure:');
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

const asset = eco.manifest.assets[0];
console.log('ECO file:', resolvedEcoPath);
console.log('Document name:', asset.name || 'unknown');
console.log('Declared hash:', asset.hash);

let matchResult = null;
if (originalPath) {
  const resolvedOriginalPath = path.resolve(originalPath);
  const originalBytes = fs.readFileSync(resolvedOriginalPath);
  const calculatedHash = sha256Hex(originalBytes);
  matchResult = calculatedHash.toLowerCase() === asset.hash.toLowerCase();
  console.log('Original file:', resolvedOriginalPath);
  console.log('Calculated hash:', calculatedHash);
  console.log('Hash match:', matchResult ? 'YES' : 'NO');
}

console.log('Signature verification: not performed in this CLI.');
process.exit(matchResult === false ? 2 : 0);
