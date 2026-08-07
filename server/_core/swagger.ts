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
      url: 'https://api.movefix.com/v1',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.movefix.com/v1',
      description: 'Staging server',
    },
    {
      url: 'http://localhost:3000/v1',
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
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                    example: 'SecurePass123!',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: {
                      type: 'string',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    },
                    user: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'User registration',
        description: 'Create a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name', 'phone'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                  },
                  password: {
                    type: 'string',
                    format: 'password',
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
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
          400: {
            description: 'Validation error',
          },
          409: {
            description: 'User already exists',
          },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List orders',
        description: 'Get list of orders for current user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending', 'accepted', 'completed', 'cancelled'],
            },
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              default: 20,
            },
          },
          {
            name: 'offset',
            in: 'query',
            schema: {
              type: 'integer',
              default: 0,
            },
          },
        ],
        responses: {
          200: {
            description: 'List of orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Order',
                      },
                    },
                    total: {
                      type: 'integer',
                    },
                    limit: {
                      type: 'integer',
                    },
                    offset: {
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
          },
        },
      },
      post: {
        tags: ['Orders'],
        summary: 'Create order',
        description: 'Create a new service order',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['category', 'description', 'budget'],
                properties: {
                  category: {
                    type: 'string',
                    example: 'temizlik',
                  },
                  description: {
                    type: 'string',
                  },
                  budget: {
                    type: 'number',
                    example: 1000,
                  },
                  location: {
                    type: 'object',
                    properties: {
                      latitude: {
                        type: 'number',
                      },
                      longitude: {
                        type: 'number',
                      },
                      address: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Order created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Order',
                },
              },
            },
          },
          400: {
            description: 'Validation error',
          },
        },
      },
    },
    '/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Create payment',
        description: 'Process a payment for an order',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId', 'amount', 'paymentMethod'],
                properties: {
                  orderId: {
                    type: 'string',
                  },
                  amount: {
                    type: 'number',
                  },
                  paymentMethod: {
                    type: 'string',
                    enum: ['card', 'wallet', 'bank_transfer'],
                  },
                  cardToken: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Payment processed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Payment',
                },
              },
            },
          },
          402: {
            description: 'Payment failed',
          },
        },
      },
    },
    '/wallet/balance': {
      get: {
        tags: ['Wallet'],
        summary: 'Get wallet balance',
        description: 'Get current wallet balance',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Wallet balance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    balance: {
                      type: 'number',
                    },
                    currency: {
                      type: 'string',
                      example: 'TRY',
                    },
                    lastUpdated: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/withdraw': {
      post: {
        tags: ['Wallet'],
        summary: 'Withdraw funds',
        description: 'Withdraw funds from wallet to bank account',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'bankAccount'],
                properties: {
                  amount: {
                    type: 'number',
                  },
                  bankAccount: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Withdrawal processed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    withdrawalId: {
                      type: 'string',
                    },
                    status: {
                      type: 'string',
                      enum: ['pending', 'completed', 'failed'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/notifications/preferences': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification preferences',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Notification preferences',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/NotificationPreferences',
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Notifications'],
        summary: 'Update notification preferences',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NotificationPreferences',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Preferences updated',
          },
        },
      },
    },
    '/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Get analytics dashboard',
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
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login',
      },
    },
  },
};

/**
 * API Documentation Routes
 */
export const setupSwaggerDocs = (app: any) => {
  // Swagger UI endpoint
  app.get('/api-docs', (req: any, res: any) => {
    res.json(swaggerSpec);
  });

  // Swagger UI HTML
  app.get('/api-docs/ui', (req: any, res: any) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Move&Fix API Documentation</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
          <style>
            body {
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          <redoc spec-url='/api-docs'></redoc>
          <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"> </script>
        </body>
      </html>
    `);
  });

  console.log('✅ Swagger documentation available at /api-docs/ui');
};
