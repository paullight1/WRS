import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const productionFiles = [
  'src/lib/**/*.{js,mjs}',
  'src/domain/**/*.{js,mjs,ts}',
  'src/services/**/*.{js,mjs,ts}',
  'src/infrastructure/**/*.{js,mjs,ts}',
  'tests/**/*.{js,mjs,jsx,ts,tsx}',
]

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: productionFiles,
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['src/domain/**/*.ts', 'src/services/**/*.ts', 'src/infrastructure/**/*.ts', 'tests/**/*.ts'],
  })),
]
