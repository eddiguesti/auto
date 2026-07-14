import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**']
  },

  // React/JSX files
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021
      },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...js.configs.recommended.rules,
      // Mark identifiers used in JSX as used — without this every JSX-only
      // import is a false-positive no-unused-vars warning
      'react/jsx-uses-vars': 'error',
      // React hooks rules
      ...reactHooks.configs.recommended.rules,
      // React refresh for HMR
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Relax some rules to avoid breaking existing code
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // Debug logging in dev
      'no-constant-condition': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      'no-var': 'warn'
    }
  }
]
