import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  // Production TypeScript files
  {
    files: ['scripts/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.pbt.test.ts', '**/*.property.test.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // MUST rules (error) — hard limits
      'complexity': ['error', { max: 15 }],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // SHOULD rules (warn) — soft limits
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Test files — exempt from file size and function length limits
  {
    files: ['tests/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
);
