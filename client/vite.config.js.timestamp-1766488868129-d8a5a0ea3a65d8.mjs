// vite.config.js
import { defineConfig } from "file:///home/manu/dev/ecosign/client/node_modules/vite/dist/node/index.js";
import react from "file:///home/manu/dev/ecosign/client/node_modules/@vitejs/plugin-react/dist/index.js";
import { sentryVitePlugin } from "file:///home/manu/dev/ecosign/client/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    // Sentry source maps upload (only in production builds)
    process.env.NODE_ENV === "production" && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN
    })
  ].filter(Boolean),
  define: {
    global: "globalThis"
  },
  server: {
    port: 5173
  },
  optimizeDeps: {
    exclude: ["@noble/hashes", "@noble/ed25519", "@noble/secp256k1"],
    esbuildOptions: {
      define: {
        global: "globalThis"
      },
      target: "esnext"
      // Evita transpilación excesiva que causa problemas con SES
    }
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  },
  build: {
    target: "esnext",
    // Importante: evita transpilación que rompe SES
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1e3,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    sourcemap: false,
    // No source maps en producción
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ["console.log", "console.info", "console.debug"],
        // Importante: No optimizaciones agresivas que rompen código crypto
        unsafe: false,
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false,
        unsafe_proto: false,
        unsafe_regexp: false,
        unsafe_undefined: false
      },
      mangle: {
        // No mangle propiedades privadas que crypto necesita
        properties: false
      },
      format: {
        comments: false
        // Remover comentarios
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("scheduler")) {
              return "react-vendor";
            }
            if (id.includes("@supabase")) {
              return "supabase-vendor";
            }
            if (id.includes("@noble") || id.includes("@temporaldynamics/eco-packer")) {
              return "crypto-vendor";
            }
            if (id.includes("lucide-react")) {
              return "icons-vendor";
            }
            if (id.includes("pdf-lib") || id.includes("jszip")) {
              return "pdf-vendor";
            }
            if (id.includes("react-router")) {
              return "router-vendor";
            }
            if (id.includes("@sentry")) {
              return "sentry-vendor";
            }
            return "vendor";
          }
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith(".css")) {
            return "assets/style-[hash].css";
          }
          return "assets/[name]-[hash][extname]";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        // Importante: formato ES para evitar problemas con SES
        format: "es"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9tYW51L2Rldi9lY29zaWduL2NsaWVudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvbWFudS9kZXYvZWNvc2lnbi9jbGllbnQvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvbWFudS9kZXYvZWNvc2lnbi9jbGllbnQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgc2VudHJ5Vml0ZVBsdWdpbiB9IGZyb20gJ0BzZW50cnkvdml0ZS1wbHVnaW4nXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICAvLyBTZW50cnkgc291cmNlIG1hcHMgdXBsb2FkIChvbmx5IGluIHByb2R1Y3Rpb24gYnVpbGRzKVxuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgJiYgcHJvY2Vzcy5lbnYuU0VOVFJZX0FVVEhfVE9LRU4gJiYgc2VudHJ5Vml0ZVBsdWdpbih7XG4gICAgICBvcmc6IHByb2Nlc3MuZW52LlNFTlRSWV9PUkcsXG4gICAgICBwcm9qZWN0OiBwcm9jZXNzLmVudi5TRU5UUllfUFJPSkVDVCxcbiAgICAgIGF1dGhUb2tlbjogcHJvY2Vzcy5lbnYuU0VOVFJZX0FVVEhfVE9LRU4sXG4gICAgfSksXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxuICBkZWZpbmU6IHtcbiAgICBnbG9iYWw6ICdnbG9iYWxUaGlzJyxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydAbm9ibGUvaGFzaGVzJywgJ0Bub2JsZS9lZDI1NTE5JywgJ0Bub2JsZS9zZWNwMjU2azEnXSxcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgZGVmaW5lOiB7XG4gICAgICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnXG4gICAgICB9LFxuICAgICAgdGFyZ2V0OiAnZXNuZXh0JywgLy8gRXZpdGEgdHJhbnNwaWxhY2lcdTAwRjNuIGV4Y2VzaXZhIHF1ZSBjYXVzYSBwcm9ibGVtYXMgY29uIFNFU1xuICAgIH1cbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6ICcvc3JjJyxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIHRhcmdldDogJ2VzbmV4dCcsIC8vIEltcG9ydGFudGU6IGV2aXRhIHRyYW5zcGlsYWNpXHUwMEYzbiBxdWUgcm9tcGUgU0VTXG4gICAgY3NzQ29kZVNwbGl0OiB0cnVlLFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICBjb21tb25qc09wdGlvbnM6IHtcbiAgICAgIHRyYW5zZm9ybU1peGVkRXNNb2R1bGVzOiB0cnVlXG4gICAgfSxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLCAvLyBObyBzb3VyY2UgbWFwcyBlbiBwcm9kdWNjaVx1MDBGM25cbiAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSxcbiAgICAgICAgcGFzc2VzOiAyLFxuICAgICAgICBwdXJlX2Z1bmNzOiBbJ2NvbnNvbGUubG9nJywgJ2NvbnNvbGUuaW5mbycsICdjb25zb2xlLmRlYnVnJ10sXG4gICAgICAgIC8vIEltcG9ydGFudGU6IE5vIG9wdGltaXphY2lvbmVzIGFncmVzaXZhcyBxdWUgcm9tcGVuIGNcdTAwRjNkaWdvIGNyeXB0b1xuICAgICAgICB1bnNhZmU6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfY29tcHM6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfRnVuY3Rpb246IGZhbHNlLFxuICAgICAgICB1bnNhZmVfbWF0aDogZmFsc2UsXG4gICAgICAgIHVuc2FmZV9wcm90bzogZmFsc2UsXG4gICAgICAgIHVuc2FmZV9yZWdleHA6IGZhbHNlLFxuICAgICAgICB1bnNhZmVfdW5kZWZpbmVkOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBtYW5nbGU6IHtcbiAgICAgICAgLy8gTm8gbWFuZ2xlIHByb3BpZWRhZGVzIHByaXZhZGFzIHF1ZSBjcnlwdG8gbmVjZXNpdGFcbiAgICAgICAgcHJvcGVydGllczogZmFsc2UsXG4gICAgICB9LFxuICAgICAgZm9ybWF0OiB7XG4gICAgICAgIGNvbW1lbnRzOiBmYWxzZSwgLy8gUmVtb3ZlciBjb21lbnRhcmlvc1xuICAgICAgfVxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgIC8vIENvcmUgUmVhY3RcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QnKSB8fCBpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgfHwgaWQuaW5jbHVkZXMoJ3NjaGVkdWxlcicpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAncmVhY3QtdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFN1cGFiYXNlXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BzdXBhYmFzZScpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnc3VwYWJhc2UtdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENyeXB0byAoYWlzbGFkbyBwYXJhIGV2aXRhciBjb25mbGljdG9zIFNFUylcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQG5vYmxlJykgfHwgaWQuaW5jbHVkZXMoJ0B0ZW1wb3JhbGR5bmFtaWNzL2Vjby1wYWNrZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2NyeXB0by12ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWNvbnNcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbHVjaWRlLXJlYWN0JykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdpY29ucy12ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUERGIChsYXp5KVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdwZGYtbGliJykgfHwgaWQuaW5jbHVkZXMoJ2pzemlwJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdwZGYtdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJvdXRlclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1yb3V0ZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3JvdXRlci12ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU2VudHJ5XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BzZW50cnknKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3NlbnRyeS12ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gT3Ryb3NcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XG4gICAgICAgICAgaWYgKGFzc2V0SW5mby5uYW1lLmVuZHNXaXRoKCcuY3NzJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXNzZXRzL3N0eWxlLVtoYXNoXS5jc3MnO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJztcbiAgICAgICAgfSxcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIC8vIEltcG9ydGFudGU6IGZvcm1hdG8gRVMgcGFyYSBldml0YXIgcHJvYmxlbWFzIGNvbiBTRVNcbiAgICAgICAgZm9ybWF0OiAnZXMnLFxuICAgICAgfVxuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeVEsU0FBUyxvQkFBb0I7QUFDdFMsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsd0JBQXdCO0FBR2pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQTtBQUFBLElBRU4sUUFBUSxJQUFJLGFBQWEsZ0JBQWdCLFFBQVEsSUFBSSxxQkFBcUIsaUJBQWlCO0FBQUEsTUFDekYsS0FBSyxRQUFRLElBQUk7QUFBQSxNQUNqQixTQUFTLFFBQVEsSUFBSTtBQUFBLE1BQ3JCLFdBQVcsUUFBUSxJQUFJO0FBQUEsSUFDekIsQ0FBQztBQUFBLEVBQ0gsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxpQkFBaUIsa0JBQWtCLGtCQUFrQjtBQUFBLElBQy9ELGdCQUFnQjtBQUFBLE1BQ2QsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLFFBQVE7QUFBQTtBQUFBLElBQ1Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLO0FBQUEsSUFDUDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQTtBQUFBLElBQ1IsY0FBYztBQUFBLElBQ2QsdUJBQXVCO0FBQUEsSUFDdkIsaUJBQWlCO0FBQUEsTUFDZix5QkFBeUI7QUFBQSxJQUMzQjtBQUFBLElBQ0EsV0FBVztBQUFBO0FBQUEsSUFDWCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxlQUFlO0FBQUEsUUFDZixRQUFRO0FBQUEsUUFDUixZQUFZLENBQUMsZUFBZSxnQkFBZ0IsZUFBZTtBQUFBO0FBQUEsUUFFM0QsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsaUJBQWlCO0FBQUEsUUFDakIsYUFBYTtBQUFBLFFBQ2IsY0FBYztBQUFBLFFBQ2QsZUFBZTtBQUFBLFFBQ2Ysa0JBQWtCO0FBQUEsTUFDcEI7QUFBQSxNQUNBLFFBQVE7QUFBQTtBQUFBLFFBRU4sWUFBWTtBQUFBLE1BQ2Q7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLFVBQVU7QUFBQTtBQUFBLE1BQ1o7QUFBQSxJQUNGO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFDZixjQUFJLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFFL0IsZ0JBQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsV0FBVyxLQUFLLEdBQUcsU0FBUyxXQUFXLEdBQUc7QUFDaEYscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksR0FBRyxTQUFTLFdBQVcsR0FBRztBQUM1QixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsUUFBUSxLQUFLLEdBQUcsU0FBUyw4QkFBOEIsR0FBRztBQUN4RSxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLEdBQUcsU0FBUyxTQUFTLEtBQUssR0FBRyxTQUFTLE9BQU8sR0FBRztBQUNsRCxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQy9CLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLEdBQUcsU0FBUyxTQUFTLEdBQUc7QUFDMUIscUJBQU87QUFBQSxZQUNUO0FBRUEsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLFFBQ0EsZ0JBQWdCLENBQUMsY0FBYztBQUM3QixjQUFJLFVBQVUsS0FBSyxTQUFTLE1BQU0sR0FBRztBQUNuQyxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxRQUNBLGdCQUFnQjtBQUFBO0FBQUEsUUFFaEIsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
