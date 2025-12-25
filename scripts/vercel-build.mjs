import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ecoPackerDir = path.join(root, 'eco-packer');
const requiredEcoPackerFiles = [
  path.join(ecoPackerDir, 'src', 'types.ts'),
  path.join(ecoPackerDir, 'src', 'errors.ts'),
  path.join(ecoPackerDir, 'src', 'verificationService.ts')
];

const shouldSkipEcoPacker =
  process.env.SKIP_ECOPACKER_BUILD === '1' ||
  requiredEcoPackerFiles.some((file) => !existsSync(file));

if (shouldSkipEcoPacker) {
  console.log('⚠️ Skipping eco-packer build (missing files or SKIP_ECOPACKER_BUILD=1).');
} else {
  execSync('npm install', { cwd: ecoPackerDir, stdio: 'inherit' });
  execSync('npm run build', { cwd: ecoPackerDir, stdio: 'inherit' });
}

const clientDir = path.join(root, 'client');
execSync('npm install', { cwd: clientDir, stdio: 'inherit' });
execSync('npm run build:skip-validation', { cwd: clientDir, stdio: 'inherit' });
