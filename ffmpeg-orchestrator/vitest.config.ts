import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    threads: false,
    coverage: {
      enabled: false,
    },
  },
  resolve: {
    alias: {
      '@temporaldynamics/timeline-engine': path.resolve(__dirname, '../timeline-engine/dist/index.js'),
    },
  },
});
