
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

// This function converts camelCase or PascalCase to kebab-case.
// e.g., "CheckCircle" -> "check-circle", "Building2" -> "building-2"
function toKebabCase(str) {
  if (str === 'LayoutDashboard') return 'layout-dashboard'; // Manual override for edge case
  return str
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/^-/, '');
}

async function refactorImports() {
  const files = await glob('client/src/**/*.{js,jsx,ts,tsx}');
  let changesMade = false;
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g;

  console.log('Starting lucide-react import refactoring...');

  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8');
    let originalContent = content;
    
    const matches = content.match(importRegex);

    if (matches) {
      let newImports = '';
      for (const match of matches) {
        const namedImportsRaw = match.substring(match.indexOf('{') + 1, match.lastIndexOf('}'));
        
        const individualImports = namedImportsRaw
          .split(',')
          .map(imp => imp.trim())
          .filter(Boolean)
          .map(imp => {
            let iconName;
            let alias;
            if (/\s+as\s+/.test(imp)) {
              const parts = imp.split(/\s+as\s+/);
              iconName = parts[0].trim();
              alias = parts[1].trim();
            } else {
              iconName = imp;
              alias = imp;
            }
            
            // Handle potential empty strings from trailing commas
            if (!iconName) return null;

            const kebabIconName = toKebabCase(iconName);
            return `import ${alias} from 'lucide-react/dist/esm/icons/${kebabIconName}';`;
          })
          .filter(Boolean) // Filter out nulls
          .join('\n');

        content = content.replace(match, individualImports);
      }

      if (content !== originalContent) {
        console.log(`Refactoring imports in ${file}`);
        await fs.writeFile(file, content, 'utf-8');
        changesMade = true;
      }
    }
  }

  if (changesMade) {
    console.log('Refactoring complete. Please review the changes.');
  } else {
    console.log('No files needed refactoring.');
  }
}

refactorImports().catch(error => {
  console.error('An error occurred during refactoring:', error);
});
