import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'docs/implementation_plan/assets/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { import: importPlugin, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'import/no-restricted-paths': ['error', { zones: [
        { target: './src/features', from: './src/infrastructure', message: 'UI must use application use cases.' },
        { target: './src/domain', from: ['./src/application', './src/infrastructure', './src/features'], message: 'Domain must remain dependency-free.' }
      ] }],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['vite.config.ts', 'playwright.config.ts', 'vitest.config.ts'],
    languageOptions: { globals: { process: 'readonly' } }
  }
);
