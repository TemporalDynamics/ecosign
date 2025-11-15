import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['client/src/**/*', 'netlify/functions/**/*'],
      exclude: [
        'client/src/**/*.test.{ts,tsx}',
        'tests/**/*',
        'node_modules/**/*',
        'dist/**/*'
      ]
    }
  },
});