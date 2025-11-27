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
        global: true,  // Enable global object
        process: true,  // Enable process object
      },
      // Only polyfill what we absolutely need
      protocolImports: false,
    })
  ],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    // No proxy for API routes - they will be handled by Vercel in production
    // For local development, you would need to run a separate server or use Vercel CLI
  },
  optimizeDeps: {
    exclude: ['@noble/hashes'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // Inline all CSS into the HTML to eliminate render-blocking requests
    cssCodeSplit: false,
    // Suppress chunk size warnings for now
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    // Enable sourcemaps for production debugging
    sourcemap: true,
    // Use Terser for more aggressive minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        // Code splitting is intentionally disabled due to polyfill issues
        // with the eco-packer library. Do not enable manualChunks without
        // thorough testing.
        manualChunks: undefined
      }
    }
  }
})