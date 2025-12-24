import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['server/**/__tests__/**/*.test.ts', 'server/**/__tests__/**/*.spec.ts'],
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
});
