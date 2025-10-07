import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

console.info('[vitest-config] node', process.versions.node, 'cwd', process.cwd());

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
