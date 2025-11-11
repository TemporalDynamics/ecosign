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
    // No proxy for API routes - they will be handled by Vercel in production
    // For local development, you would need to run a separate server or use Vercel CLI
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