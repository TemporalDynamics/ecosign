import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
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
    // Enable CSS code splitting for better caching
    cssCodeSplit: true,
    // Suppress chunk size warnings for now
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    // Disable sourcemaps in production for smaller bundle
    sourcemap: false,
    // Use Terser for more aggressive minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        properties: {
          regex: /^__/
        }
      },
    },
    rollupOptions: {
      output: {
        // Optimize code splitting to reduce main bundle size
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react';
            }
            // Supabase client
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Eco-packer (heavy crypto library)
            if (id.includes('@temporaldynamics/eco-packer') || id.includes('noble')) {
              return 'eco-packer';
            }
            // Icons library
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // PDF processing (heavy) - lazy loaded
            if (id.includes('pdf-lib') || id.includes('pdfjs') || id.includes('pako') || id.includes('upng')) {
              return 'pdf-utils';
            }
            // Crypto libraries (heavy) - lazy loaded
            if (id.includes('crypto') || id.includes('buffer') || id.includes('asn1') || id.includes('bn.js')) {
              return 'crypto';
            }
            // @noble libraries (used by eco-packer)
            if (id.includes('@noble/hashes') || id.includes('@noble/ed25519') || id.includes('@noble/secp256k1')) {
              return 'noble-crypto';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // All other node_modules go to a generic vendor chunk
            return 'vendor';
          }
        },
        // Add content hashing for better caching
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/style-[hash].css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
})
