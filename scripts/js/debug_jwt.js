#!/usr/bin/env node
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
const USER_ID = '11111111-1111-1111-1111-111111111111';

// Generate token the way we're doing it
const token = jwt.sign(
  { sub: USER_ID, role: 'authenticated' },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '60s' }
);

console.log('Generated JWT:', token);
console.log('\nDecoded:');
console.log(jwt.decode(token));

// Try alternative format
const token2 = jwt.sign(
  {
    aud: 'authenticated',
    sub: USER_ID,
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60
  },
  JWT_SECRET,
  { algorithm: 'HS256' }
);

console.log('\n\nAlternative JWT:', token2);
console.log('\nDecoded:');
console.log(jwt.decode(token2));
