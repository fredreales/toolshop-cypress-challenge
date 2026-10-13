import js from '@eslint/js';
import globals from 'globals';
import cypress from 'eslint-plugin-cypress/flat';

export default [
  {
    ignores: ['node_modules/**', 'cypress/screenshots/**', 'cypress/videos/**'],
  },
  js.configs.recommended,
  cypress.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.mocha },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'cypress/no-unnecessary-waiting': 'error',
      'cypress/unsafe-to-chain-command': 'warn',
    },
  },
  {
    files: ['cypress.config.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
];
