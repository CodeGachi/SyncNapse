import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

console.info('[vitest-config] node', process.versions.node, 'cwd', process.cwd());

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 1,
        singleFork: true,
      },
    },
    testTimeout: 30000,
    teardownTimeout: 5000,
    fileParallelism: false,
    maxConcurrency: 1,
  },
});
