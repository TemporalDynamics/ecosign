#!/usr/bin/env node
/**
 * Script para arreglar los imports de lucide-react
 * Cambia de: import { Icon } from 'lucide-react/dist/esm/icons/icon-name'
 * A: import { Icon } from 'lucide-react'
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = await glob('client/src/**/*.{js,jsx,ts,tsx}', { ignore: 'node_modules/**' });

let totalFixed = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf-8');

  // Regex para capturar imports de lucide-react/dist/esm
  const regex = /from ['"]lucide-react\/dist\/esm\/icons\/[^'"]+['"]/g;

  if (regex.test(content)) {
    const newContent = content.replace(
      /from ['"]lucide-react\/dist\/esm\/icons\/[^'"]+['"]/g,
      `from 'lucide-react'`
    );

    writeFileSync(file, newContent, 'utf-8');
    console.log(`✅ Fixed: ${file}`);
    totalFixed++;
  }
}

console.log(`\n✅ Total files fixed: ${totalFixed}`);
