import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{js,cjs}', 'src/**/*.spec.{js,cjs}'],
  },
});
