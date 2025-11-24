#!/usr/bin/env node
/**
 * Build-time validation script
 * Verifies environment variables before deployment
 * Fails CI/CD if configuration is invalid
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateVar(name, value) {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: 'Variable is empty or undefined' };
  }

  // Check for placeholders
  const placeholders = ['YOUR_', 'xxx', '...', 'REPLACE_ME', 'TODO'];
  for (const placeholder of placeholders) {
    if (value.includes(placeholder)) {
      return { valid: false, error: `Contains placeholder: ${placeholder}` };
    }
  }

  return { valid: true };
}

function validateSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    const isHosted = parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
    const isLocalHost = ['localhost', '127.0.0.1'].includes(parsed.hostname);

    if (!isHosted && !isLocalHost) {
      return { valid: false, error: 'Must be a valid Supabase URL or localhost' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function validateJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'JWT must have 3 parts separated by "."' };
  }

  // Check base64 format
  const isBase64 = parts.every(part => /^[A-Za-z0-9_-]+$/.test(part));
  if (!isBase64) {
    return { valid: false, error: 'JWT parts must be valid base64' };
  }

  return { valid: true };
}

function main() {
  log('\n🔍 Validating environment variables...\n', 'yellow');

  const errors = [];
  const warnings = [];

  // Required variables
  const requiredVars = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  };

  // Validate each required variable
  for (const [name, value] of Object.entries(requiredVars)) {
    const basicCheck = validateVar(name, value);

    if (!basicCheck.valid) {
      errors.push(`${name}: ${basicCheck.error}`);
      continue;
    }

    // Specific validations
    if (name === 'VITE_SUPABASE_URL') {
      const urlCheck = validateSupabaseUrl(value);
      if (!urlCheck.valid) {
        errors.push(`${name}: ${urlCheck.error}`);
      }
    }

    if (name === 'VITE_SUPABASE_ANON_KEY') {
      const jwtCheck = validateJWT(value);
      if (!jwtCheck.valid) {
        errors.push(`${name}: ${jwtCheck.error}`);
      }
    }
  }

  // Check for localhost in production
  if (process.env.NODE_ENV === 'production') {
    const url = process.env.VITE_SUPABASE_URL || '';
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      errors.push('VITE_SUPABASE_URL: Cannot use localhost in production');
    }
  }

  // Report results
  if (errors.length > 0) {
    log('\n❌ Validation FAILED\n', 'red');
    errors.forEach(error => log(`  • ${error}`, 'red'));
    log('\n📝 Fix these issues before deploying:\n', 'yellow');
    log('  1. Check your .env.local file', 'yellow');
    log('  2. Verify Supabase project credentials', 'yellow');
    log('  3. Run this script again: npm run validate:env\n', 'yellow');
    process.exit(1);
  }

  if (warnings.length > 0) {
    log('\n⚠️  Warnings:\n', 'yellow');
    warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
  }

  log('\n✅ All environment variables are valid!\n', 'green');
  log('Environment:', 'green');
  log(`  • Supabase URL: ${requiredVars.VITE_SUPABASE_URL}`, 'green');
  log(`  • Anon Key: ${requiredVars.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...\n`, 'green');
}

main();
