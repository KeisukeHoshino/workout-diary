import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'docs/implementation_plan/assets/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { import: importPlugin, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/use-memo': 'off',
      'import/no-restricted-paths': ['error', { zones: [
        { target: './src/features', from: './src/infrastructure', message: '画面はApplication Serviceを経由してください。' },
        { target: './src/domain', from: ['./src/application', './src/infrastructure', './src/features', './src/app'], message: 'Domainは外側の層へ依存できません。' }
      ] }]
    }
  },
  {
    files: ['vite.config.ts', 'playwright.config.ts', 'vitest.config.ts'],
    languageOptions: { globals: { process: 'readonly' } }
  }
);
