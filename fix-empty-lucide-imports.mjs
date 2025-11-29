#!/usr/bin/env node
/**
 * Script para eliminar imports vacíos de lucide-react
 * y consolidar los iconos usados en un solo import
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientSrcPath = path.join(__dirname, 'client', 'src');

// Función para encontrar todos los archivos .jsx y .tsx
async function findFiles(dir, extension) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules') {
      files.push(...await findFiles(fullPath, extension));
    } else if (item.isFile() && (item.name.endsWith('.jsx') || item.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Función para extraer iconos usados en el archivo
function extractUsedIcons(content) {
  const icons = new Set();

  // Buscar componentes con mayúscula inicial (posibles iconos de lucide)
  const componentRegex = /<([A-Z][a-zA-Z0-9]+)/g;
  let match;

  while ((match = componentRegex.exec(content)) !== null) {
    const componentName = match[1];
    // Filtrar componentes comunes de React que NO son iconos
    const excludeList = ['Suspense', 'Fragment', 'ErrorBoundary', 'Routes', 'Route',
                         'Navigate', 'Link', 'BrowserRouter', 'MemoryRouter',
                         'LinkGenerator', 'DocumentList', 'DashboardNav', 'FooterInternal',
                         'CertificationModal', 'ProtectedRoute', 'VideoPlayerProvider'];

    if (!excludeList.includes(componentName)) {
      icons.add(componentName);
    }
  }

  // Caso especial: Link se renombra a LinkIcon
  if (icons.has('LinkIcon')) {
    icons.delete('LinkIcon');
    icons.add('Link as LinkIcon');
  }

  return Array.from(icons).sort();
}

// Función para limpiar imports vacíos y consolidar
function fixLucideImports(content) {
  // Eliminar todos los imports vacíos de lucide-react
  content = content.replace(/import\s*{\s*}\s*from\s*['"]lucide-react['"];?\n/g, '');

  // Extraer iconos usados
  const usedIcons = extractUsedIcons(content);

  if (usedIcons.length === 0) {
    return content;
  }

  // Buscar si ya existe un import de lucide-react no vacío
  const existingImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/);

  if (existingImportMatch) {
    // Ya existe un import, no hacer nada más
    return content;
  }

  // Crear nuevo import consolidado
  const newImport = `import { ${usedIcons.join(', ')} } from 'lucide-react';`;

  // Insertar después del primer import de React
  const reactImportMatch = content.match(/import\s+React.*from\s*['"]react['"]/);
  if (reactImportMatch) {
    const insertIndex = content.indexOf(reactImportMatch[0]) + reactImportMatch[0].length;
    content = content.slice(0, insertIndex) + '\n' + newImport + content.slice(insertIndex);
  } else {
    // Si no hay import de React, insertar al inicio del archivo
    const firstImportMatch = content.match(/^import\s/m);
    if (firstImportMatch) {
      const insertIndex = content.indexOf(firstImportMatch[0]);
      content = content.slice(0, insertIndex) + newImport + '\n' + content.slice(insertIndex);
    }
  }

  return content;
}

// Main
async function main() {
  console.log('🔍 Buscando archivos con imports vacíos de lucide-react...');

  const files = await findFiles(clientSrcPath);
  console.log(`📁 Encontrados ${files.length} archivos .jsx/.tsx`);

  let fixedCount = 0;

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    // Verificar si tiene imports vacíos de lucide-react
    if (content.includes('from \'lucide-react\'') && content.includes('{  }')) {
      console.log(`🔧 Arreglando: ${path.relative(clientSrcPath, file)}`);

      const fixed = fixLucideImports(content);
      await fs.writeFile(file, fixed, 'utf-8');
      fixedCount++;
    }
  }

  console.log(`\n✅ Arreglados ${fixedCount} archivos`);
}

main().catch(console.error);
