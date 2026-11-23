import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    exclude: ['node_modules', 'lib', 'esm'],
    coverage: {
      include: ['src/**/*.ts'],
    },
  },
});
