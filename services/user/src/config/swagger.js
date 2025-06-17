const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Club Management Auth Service API',
      version: '1.0.0',
      description: 'Authentication microservice API documentation',
      contact: {
        name: 'Auth Service',
        email: 'support@clubmanagement.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.clubmanagement.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            full_name: {
              type: 'string',
              description: 'User full name'
            },
            roles: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'User roles'
            },
            email_verified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            last_login: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'full_name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (min 8 chars, must contain uppercase, lowercase, numbers, and special characters)',
              example: 'SecurePass123!'
            },
            full_name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'User full name',
              example: 'John Doe'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'SecurePass123!'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              description: 'JWT access token',
              example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            message: {
              type: 'string',
              description: 'Success message',
              example: 'User registered'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
              example: 'Bad Request'
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Validation failed'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name with error'
                  },
                  error: {
                    type: 'string',
                    description: 'Error description'
                  }
                }
              },
              description: 'Validation error details'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Operation completed successfully'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js'] // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
}; 