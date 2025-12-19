import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Sentry source maps upload (only in production builds)
    process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ].filter(Boolean),
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['@noble/hashes', '@noble/ed25519', '@noble/secp256k1'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      target: 'esnext', // Evita transpilación excesiva que causa problemas con SES
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'esnext', // Importante: evita transpilación que rompe SES
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    sourcemap: false, // No source maps en producción
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        // Importante: No optimizaciones agresivas que rompen código crypto
        unsafe: false,
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false,
        unsafe_proto: false,
        unsafe_regexp: false,
        unsafe_undefined: false,
      },
      mangle: {
        // No mangle propiedades privadas que crypto necesita
        properties: false,
      },
      format: {
        comments: false, // Remover comentarios
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Crypto (aislado para evitar conflictos SES)
            if (id.includes('@noble') || id.includes('@temporaldynamics/eco-packer')) {
              return 'crypto-vendor';
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // PDF (lazy)
            if (id.includes('pdf-lib') || id.includes('jszip')) {
              return 'pdf-vendor';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            // Sentry
            if (id.includes('@sentry')) {
              return 'sentry-vendor';
            }
            // Otros
            return 'vendor';
          }
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/style-[hash].css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        // Importante: formato ES para evitar problemas con SES
        format: 'es',
      }
    }
  }
})
