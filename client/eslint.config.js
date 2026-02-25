import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      '.vercel',
      '.vercel/**',
      '*.config.js',
      'vite.config.js',
      'postcss.config.js',
      'tailwind.config.js'
    ],
  },
  // Node.js scripts
  {
    files: ['scripts/**/*.js', 'public/service-worker.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off', // Allow console in Node.js scripts
    },
  },
  // Browser code
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: { version: '18.2' }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // React Refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // React specific
      'react/prop-types': 'off', // Not using PropTypes
      'react/display-name': 'off',

      // Best practices
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',

      // Potential bugs
      'no-constant-condition': 'warn',
      'no-unreachable': 'warn',
      'no-duplicate-case': 'error',
      'no-irregular-whitespace': 'warn',

      // Code quality
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
  // Stricter lint para archivos críticos (señal clara en CI)
  {
    files: [
      'src/components/LegalCenterModal.jsx',
      'src/pages/DocumentsPage.jsx'
    ],
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
];
