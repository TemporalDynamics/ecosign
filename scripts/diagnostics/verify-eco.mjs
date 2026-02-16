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
  if (eco?.format === 'eco' && String(eco?.format_version || '').startsWith('2')) {
    return validateEcoV2Structure(eco);
  }
  return validateLegacyEcoStructure(eco);
}

function validateLegacyEcoStructure(eco) {
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

function validateEcoV2Structure(eco) {
  const errors = [];
  if (!eco || typeof eco !== 'object') {
    errors.push('ECO payload is not an object.');
    return errors;
  }

  if (eco.format !== 'eco') {
    errors.push('format must be "eco".');
  }
  if (typeof eco.format_version !== 'string' || !eco.format_version.startsWith('2')) {
    errors.push('format_version must be 2.x.');
  }

  if (!eco.document || typeof eco.document !== 'object') {
    errors.push('Missing document section.');
    return errors;
  }

  if (!isHex64(eco.document.source_hash)) {
    errors.push('document.source_hash must be a valid SHA-256 hex string.');
  }

  if (eco.document.witness_hash != null && !isHex64(eco.document.witness_hash)) {
    errors.push('document.witness_hash must be a valid SHA-256 hex string when present.');
  }

  if (!eco.signing_act || typeof eco.signing_act !== 'object') {
    errors.push('Missing signing_act section.');
  }

  if (eco.proofs != null && !Array.isArray(eco.proofs)) {
    errors.push('proofs must be an array when present.');
  }

  return errors;
}

function getDeclaredHash(eco) {
  if (eco?.format === 'eco' && String(eco?.format_version || '').startsWith('2')) {
    return eco?.document?.witness_hash || eco?.document?.source_hash || null;
  }
  return eco?.manifest?.assets?.[0]?.hash || null;
}

function printProofSummary(eco) {
  if (!(eco?.format === 'eco' && String(eco?.format_version || '').startsWith('2'))) {
    return;
  }
  const proofs = Array.isArray(eco.proofs) ? eco.proofs : [];
  const summary = proofs.map((proof) => `${proof.kind || 'unknown'}:${proof.status || 'unknown'}`);
  console.log('Proofs:', summary.length > 0 ? summary.join(', ') : 'none');
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

console.log('ECO file:', resolvedEcoPath);
const declaredHash = getDeclaredHash(eco);
if (!declaredHash || !isHex64(declaredHash)) {
  console.error('Declared hash not found or invalid in ECO.');
  process.exit(1);
}

if (eco?.format === 'eco' && String(eco?.format_version || '').startsWith('2')) {
  console.log('ECO format:', `eco.v${eco.format_version}`);
  console.log('Document id:', eco?.document?.id || 'unknown');
  console.log('Declared hash:', declaredHash);
  printProofSummary(eco);
} else {
  const asset = eco.manifest.assets[0];
  console.log('Document name:', asset.name || 'unknown');
  console.log('Declared hash:', declaredHash);
}

let matchResult = null;
if (originalPath) {
  const resolvedOriginalPath = path.resolve(originalPath);
  const originalBytes = fs.readFileSync(resolvedOriginalPath);
  const calculatedHash = sha256Hex(originalBytes);
  matchResult = calculatedHash.toLowerCase() === declaredHash.toLowerCase();
  console.log('Original file:', resolvedOriginalPath);
  console.log('Calculated hash:', calculatedHash);
  console.log('Hash match:', matchResult ? 'YES' : 'NO');
}

console.log('Signature verification: not performed in this CLI.');
process.exit(matchResult === false ? 2 : 0);
