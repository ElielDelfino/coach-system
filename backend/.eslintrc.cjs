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
    'no-console': 'off',
    'no-process-exit': 'off',
  },
};
