import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/gate0/**/*.test.js'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
  },
});
