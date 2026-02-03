import js from '@eslint/js'
import globals from 'globals'

export default [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'apps/web/node_modules/**',
      'apps/web/dist/**',
      'apps/mobile/node_modules/**',
      'services/api/node_modules/**',
      'packages/shared/node_modules/**',
      'coverage/**',
      '*.min.js'
    ]
  },

  // Server/API code (Node.js ES modules)
  {
    files: ['services/api/**/*.js', 'packages/shared/**/*.js', 'tools/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      // Relax some rules to avoid breaking existing code
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // Server logging is intentional
      'no-constant-condition': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      'no-var': 'warn'
    }
  }
]
