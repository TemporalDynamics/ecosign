import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['client/src/**/*.{ts,tsx,js,jsx}', 'netlify/functions/**/*.{ts,tsx,js,jsx}'],
      exclude: [
        'client/src/_deprecated/**/*',
        'client/src/**/*.html',
        'client/src/**/*.md',
        'client/src/**/*.test.{ts,tsx}',
        'tests/**/*',
        'node_modules/**/*',
        'dist/**/*'
      ]
    }
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});
