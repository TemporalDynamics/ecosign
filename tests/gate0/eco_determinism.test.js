const { test, expect } = require('vitest');
const crypto = require('crypto');

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  const keys = Object.keys(obj).sort();
  const out = {};
  for (const k of keys) out[k] = canonicalize(obj[k]);
  return out;
}

function hashObj(obj) {
  const canon = JSON.stringify(canonicalize(obj));
  return crypto.createHash('sha256').update(canon).digest('hex');
}

test('ECO determinism: same input gives same hash', () => {
  const a = { b: 1, a: [2,3], z: { y: 'x' } };
  const b = { z: { y: 'x' }, a: [2,3], b: 1 };
  const h1 = hashObj(a);
  const h2 = hashObj(b);
  expect(h1).toBe(h2);
});
