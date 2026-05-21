import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{js,cjs,mjs}', 'src/**/*.spec.{js,cjs,mjs}'],
  },
});
