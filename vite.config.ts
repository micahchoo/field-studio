import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/field-studio/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: ['flexsearch']
      },
      // ============================================================================
      // Phase 4: Worker Configuration
      // ============================================================================
      worker: {
        format: 'es',
        // Bundle workers as separate chunks for better caching
        rollupOptions: {
          output: {
            // Workers are bundled as separate chunks with consistent naming
            entryFileNames: 'workers/[name]-[hash].js',
            chunkFileNames: 'workers/[name]-[hash].js',
          }
        }
      },
      build: {
        target: 'esnext',
        // Ensure workers are properly handled in production
        rollupOptions: {
          output: {
            // Separate worker chunks for better caching
            manualChunks: {
              // Group worker-related code
              'workers': ['./workers/ingest.worker', './workers/validation.worker'],
            }
          }
        }
      }
    };
});
