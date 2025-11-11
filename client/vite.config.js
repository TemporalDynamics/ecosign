import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for Buffer (needed by eco-packer)
      globals: {
        Buffer: true,
        global: false,
        process: false,
      },
      // Only polyfill what we absolutely need
      protocolImports: false,
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    // Suppress chunk size warnings for now
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Disable code splitting for eco-packer to avoid polyfill issues
        manualChunks: undefined
      }
    }
  }
})