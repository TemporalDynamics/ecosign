import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@vista/timeline-engine': path.resolve(__dirname, '../timeline-engine/src'),
    },
  },
});
