import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 60000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
  },
});
