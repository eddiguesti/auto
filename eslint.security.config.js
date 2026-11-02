import base from './eslint.config.js'
import security from 'eslint-plugin-security'
import noSecrets from 'eslint-plugin-no-secrets'
export default [
  ...base,
  { ignores: ['**/tests/**', '**/*.test.js'] },
  {
    files: ['services/api/**/*.js'],
    plugins: { security, 'no-secrets': noSecrets },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'no-secrets/no-secrets': ['error', { tolerance: 5 }]
    }
  },
  {
    files: ['services/api/utils/inviteCode.js'],
    rules: {
      // Exact reviewed public alphabet; other strings in this file still scan.
      'no-secrets/no-secrets': [
        'error',
        { tolerance: 5, ignoreContent: '^ABCDEFGHJKLMNPQRSTUVWXYZ23456789$' }
      ]
    }
  }
]
