module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  ignorePatterns: ['node_modules', 'coverage', '.eslintrc.cjs'],
  rules: {
    'no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-console': 'error',
    'no-process-exit': 'off',
  },
  overrides: [
    {
      // vitest config + test files que usam ESM (top-level import/await)
      files: ['vitest.config.js', '**/*.test.js', '**/*.spec.js'],
      parserOptions: { sourceType: 'module' },
    },
    {
      // arquivos de teste — globals do vitest disponíveis automaticamente
      files: ['**/*.test.{js,cjs}', '**/*.spec.{js,cjs}'],
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        beforeAll: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly',
      },
    },
  ],
};
