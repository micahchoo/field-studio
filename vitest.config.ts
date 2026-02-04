import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig(async () => {
  const react = await import('@vitejs/plugin-react').then(m => m.default);
  return {
    plugins: [react()],
    optimizeDeps: {
      include: ['@vitejs/plugin-react'],
    },
    ssr: {
      noExternal: ['@vitejs/plugin-react'],
    },
    esbuild: {
      target: 'node18',
    },
    test: {
      name: 'field-studio',
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['**/*.test.{ts,tsx}'],
      exclude: ['node_modules', 'dist', '.git'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        exclude: [
          'node_modules/',
          'dist/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/test/**',
          '**/mocks/**',
        ],
      },
      deps: {
        interopDefault: true,
        inline: ['@vitejs/plugin-react'],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
