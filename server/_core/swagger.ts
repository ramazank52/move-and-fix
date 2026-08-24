/**
 * OpenAPI/Swagger Documentation
 * 
 * Comprehensive API documentation for Move&Fix
 * - All endpoints documented
 * - Request/Response schemas
 * - Authentication details
 * - Error responses
 * - Examples
 */

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Move&Fix API',
    description: 'Enterprise Service Marketplace API - Comprehensive documentation',
    version: '1.0.0',
    contact: {
      name: 'Move&Fix Support',
      email: 'support@movefix.com',
      url: 'https://movefix.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://api.movefix.com',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.movefix.com',
      description: 'Staging server',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization',
    },
    {
      name: 'Users',
      description: 'User management and profiles',
    },
    {
      name: 'Orders',
      description: 'Service orders and requests',
    },
    {
      name: 'Payments',
      description: 'Payment processing and transactions',
    },
    {
      name: 'Wallet',
      description: 'Wallet management and balance',
    },
    {
      name: 'Notifications',
      description: 'Notification management',
    },
    {
      name: 'Analytics',
      description: 'System analytics and monitoring',
    },
    {
      name: 'Admin',
      description: 'Admin operations (Owner only)',
    },
  ],
  paths: {
    '/api/oauth/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'OAuth callback',
        description: 'OAuth2 authorization code callback — exchanges code for session token and redirects to frontend',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          302: { description: 'Redirect to frontend with session cookie' },
          400: { description: 'Missing code or state' },
          500: { description: 'OAuth callback failed' },
        },
      },
    },
    '/api/oauth/mobile': {
      get: {
        tags: ['Authentication'],
        summary: 'OAuth mobile exchange',
        description: 'Exchange OAuth code for session token (mobile flow — returns JSON instead of redirect)',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Session token and user info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    app_session_id: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing code or state' },
          500: { description: 'OAuth mobile exchange failed' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Returns the authenticated user (works with both cookie and Bearer token)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout',
        description: 'Clear session cookie',
        responses: {
          200: {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { success: { type: 'boolean' } } },
              },
            },
          },
        },
      },
    },
    '/api/auth/session': {
      post: {
        tags: ['Authentication'],
        summary: 'Establish session from Bearer token',
        description: 'Exchange Bearer token for session cookie (used by iframe preview)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Session established',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { description: 'Bearer token required' },
          401: { description: 'Invalid token' },
        },
      },
    },
    '/api/csrf-token': {
      get: {
        tags: ['Authentication'],
        summary: 'Get CSRF token',
        description: 'Generate a CSRF token for cookie-based state-changing requests',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'CSRF token',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { token: { type: 'string' } } },
              },
            },
          },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Simple health check endpoint',
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    timestamp: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/health/detailed': {
      get: {
        tags: ['System'],
        summary: 'Detailed health check',
        description: 'Detailed system health including database, services, and dependencies',
        responses: {
          200: {
            description: 'Detailed health status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },
    '/api/trpc/{procedure}': {
      post: {
        tags: ['tRPC'],
        summary: 'tRPC procedure call',
        description: 'Call a tRPC procedure. Procedures: system.*, owner.*, auth.*, requests.*, offers.*, messages.*, providers.*',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: 'procedure', in: 'path', required: true, schema: { type: 'string' }, example: 'requests.create' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'tRPC procedure input (varies by procedure)',
              },
            },
          },
        },
        responses: {
          200: { description: 'Procedure result' },
          400: { description: 'Bad request' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden (CSRF or insufficient permissions)' },
          429: { description: 'Rate limited' },
        },
      },
    },
    '/api-docs': {
      get: {
        tags: ['Documentation'],
        summary: 'OpenAPI spec',
        description: 'Returns the OpenAPI 3.0 specification as JSON',
        responses: {
          200: {
            description: 'OpenAPI spec',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/api-docs/ui': {
      get: {
        tags: ['Documentation'],
        summary: 'API documentation UI',
        description: 'Interactive API documentation (ReDoc)',
        responses: {
          200: { description: 'HTML documentation page' },
        },
      },
    },
    // REST endpoints below are documented for reference but the actual API surface is tRPC-based.
    // These paths are kept for OpenAPI consumer compatibility.
    '/api/trpc/requests.create': {
      post: {
        tags: ['Service Requests'],
        summary: 'Create service request',
        description: 'Create a new service request (tRPC: requests.create)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoryId', 'title'],
                properties: {
                  categoryId: { type: 'integer' },
                  title: { type: 'string', maxLength: 255 },
                  description: { type: 'string' },
                  address: { type: 'string' },
                  latitude: { type: 'string' },
                  longitude: { type: 'string' },
                  budgetMin: { type: 'number' },
                  budgetMax: { type: 'number' },
                  distanceKm: { type: 'number' },
                  estimatedPrice: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Service request created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/trpc/offers.create': {
      post: {
        tags: ['Offers'],
        summary: 'Create offer',
        description: 'Create a new offer for a service request (tRPC: offers.create)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['requestId', 'providerId', 'price'],
                properties: {
                  requestId: { type: 'integer' },
                  providerId: { type: 'integer' },
                  price: { type: 'number' },
                  message: { type: 'string' },
                  estimatedTime: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Offer created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/trpc/messages.send': {
      post: {
        tags: ['Messages'],
        summary: 'Send message',
        description: 'Send a message to another user (tRPC: messages.send)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['receiverId', 'content'],
                properties: {
                  receiverId: { type: 'integer' },
                  content: { type: 'string', minLength: 1 },
                  requestId: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Message sent' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/trpc/providers.nearby': {
      post: {
        tags: ['Providers'],
        summary: 'Get nearby providers',
        description: 'Get nearby service providers by location (tRPC: providers.nearby)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lat', 'lng'],
                properties: {
                  lat: { type: 'string' },
                  lng: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'List of nearby providers' },
        },
      },
    },
    '/api/trpc/owner.aiCommand': {
      post: {
        tags: ['Admin'],
        summary: 'AI command (Owner only)',
        description: 'Execute an AI command from the admin panel (tRPC: owner.aiCommand)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['command'],
                properties: {
                  command: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'AI command result' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden (owner only)' },
        },
      },
    },
    '/api/trpc/owner.withdrawFunds': {
      post: {
        tags: ['Admin'],
        summary: 'Withdraw funds (Owner only)',
        description: 'Withdraw platform funds (tRPC: owner.withdrawFunds)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Withdrawal processed' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden (owner only)' },
        },
      },
    },
    // Legacy REST paths kept for reference
    '/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Get analytics dashboard (legacy)',
        description: 'Get system analytics and monitoring data (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Analytics data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    systemHealth: {
                      type: 'object',
                    },
                    serviceMetrics: {
                      type: 'array',
                    },
                    errorStats: {
                      type: 'object',
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - Admin access required',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          name: {
            type: 'string',
          },
          phone: {
            type: 'string',
          },
          userType: {
            type: 'string',
            enum: ['customer', 'provider'],
          },
          verified: {
            type: 'boolean',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          userId: {
            type: 'string',
          },
          category: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          budget: {
            type: 'number',
          },
          status: {
            type: 'string',
            enum: ['pending', 'accepted', 'completed', 'cancelled'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          orderId: {
            type: 'string',
          },
          amount: {
            type: 'number',
          },
          status: {
            type: 'string',
            enum: ['pending', 'completed', 'failed', 'refunded'],
          },
          transactionId: {
            type: 'string',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      NotificationPreferences: {
        type: 'object',
        properties: {
          channels: {
            type: 'object',
            properties: {
              push: {
                type: 'boolean',
              },
              sms: {
                type: 'boolean',
              },
              email: {
                type: 'boolean',
              },
              in_app: {
                type: 'boolean',
              },
            },
          },
          quietHours: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
              },
              startTime: {
                type: 'string',
                example: '22:00',
              },
              endTime: {
                type: 'string',
                example: '08:00',
              },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          code: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
          requestId: {
            type: 'string',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          checks: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer token (mobile auth) — obtained from /api/oauth/mobile',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'app_session',
        description: 'Session cookie (web auth) — obtained from /api/oauth/callback or /api/auth/session',
      },
    },
  },
};

/**
 * API Documentation Routes
 */
export const setupSwaggerDocs = (app: import('express').Express) => {
  const production = process.env.NODE_ENV === "production";
  const denyProductionDocumentation = (res: import("express").Response) => {
    if (!production) return false;
    res.status(404).json({ error: "NOT_FOUND" });
    return true;
  };
  // Swagger UI endpoint
  app.get('/api-docs', (_req, res) => {
    if (denyProductionDocumentation(res)) return;
    res.json(swaggerSpec);
  });

  // Swagger UI HTML
  app.get('/api-docs/ui', (_req, res) => {
    if (denyProductionDocumentation(res)) return;
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Move&Fix API Documentation</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          <redoc spec-url='/api-docs'></redoc>
          <script src="/assets/redoc.standalone.js"> </script>
        </body>
      </html>
    `);
  });

  console.log('✅ Swagger documentation available at /api-docs/ui');
};
