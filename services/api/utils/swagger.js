/**
 * OpenAPI / Swagger configuration for Easy Memoir API.
 * Mounts interactive docs at /api/docs (admin-only in production).
 */

import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { authenticateToken } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'Easy Memoir API',
    version: '1.0.0',
    description:
      'REST API for the Easy Memoir AI-powered autobiography platform. ' +
      'Most endpoints require a Bearer JWT obtained from POST /api/auth/login.'
  },
  servers: [{ url: '/api', description: 'Current server' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from /auth/login or /auth/google'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          message: { type: 'string', example: 'body: email is required' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 42 },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          name: { type: 'string', example: 'Alice Smith' },
          birth_year: { type: 'integer', example: 1955 },
          avatar_url: { type: 'string', nullable: true },
          is_premium: { type: 'boolean' },
          is_admin: { type: 'boolean' }
        }
      },
      Story: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          chapter_id: { type: 'string', example: 'childhood' },
          question_id: { type: 'string', example: 'first-memory' },
          answer: { type: 'string' },
          word_count: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }]
}

const options = {
  definition,
  apis: [
    // Load JSDoc annotations from all route files
    './services/api/routes/*.js',
    './services/api/routes/game/*.js'
  ]
}

export const swaggerSpec = swaggerJsdoc(options)

/**
 * Mount Swagger UI at /api/docs.
 * In production the route is guarded by requireAdmin so only admins can view it.
 * In development it is open for convenience.
 */
export function mountSwaggerDocs(app) {
  const isProduction = process.env.NODE_ENV === 'production'

  const swaggerUiMiddleware = swaggerUi.serve
  const swaggerSetupMiddleware = swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Easy Memoir API Docs',
    swaggerOptions: {
      persistAuthorization: true
    }
  })

  if (isProduction) {
    // authenticateToken must run before requireAdmin (which reads req.user)
    app.use(
      '/api/docs',
      swaggerUiMiddleware,
      authenticateToken,
      requireAdmin,
      swaggerSetupMiddleware
    )
    app.get('/api/docs.json', authenticateToken, requireAdmin, (req, res) => res.json(swaggerSpec))
  } else {
    app.use('/api/docs', swaggerUiMiddleware, swaggerSetupMiddleware)
    app.get('/api/docs.json', (req, res) => res.json(swaggerSpec))
  }
}
