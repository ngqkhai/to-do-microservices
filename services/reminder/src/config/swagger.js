const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Reminder Service API',
      version: '1.0.0',
      description: 'Microservice for managing task reminders in the To-Do application',
      contact: {
        name: 'API Support',
        email: 'support@todoapp.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3004',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3000/reminder-service',
        description: 'Development server via API Gateway'
      }
    ],
    components: {
      securitySchemes: {
        ApiGatewayAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'JWT token from API Gateway'
        },
        UserHeaders: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'User ID header from API Gateway'
        }
      },
      schemas: {
        Reminder: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique reminder identifier'
            },
            taskId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated task ID'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who owns the reminder'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Original due date of the task'
            },
            remindBefore: {
              type: 'integer',
              minimum: 1,
              maximum: 10080,
              description: 'Minutes before due date to send reminder (max 7 days)'
            },
            reminderTime: {
              type: 'string',
              format: 'date-time',
              description: 'Calculated time when reminder should be sent'
            },
            sent: {
              type: 'boolean',
              description: 'Whether the reminder has been sent'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the reminder was created'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the reminder was last updated'
            }
          }
        },
        CreateReminderRequest: {
          type: 'object',
          required: ['taskId', 'dueDate'],
          properties: {
            taskId: {
              type: 'string',
              format: 'uuid',
              description: 'Task ID to create reminder for'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Due date of the task'
            },
            remindBefore: {
              type: 'integer',
              minimum: 1,
              maximum: 10080,
              default: 30,
              description: 'Minutes before due date to send reminder'
            }
          }
        },
        UpdateReminderRequest: {
          type: 'object',
          properties: {
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'New due date of the task'
            },
            remindBefore: {
              type: 'integer',
              minimum: 1,
              maximum: 10080,
              description: 'Minutes before due date to send reminder'
            }
          }
        },
        ReminderStats: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of reminders'
            },
            sent: {
              type: 'integer',
              description: 'Number of reminders that have been sent'
            },
            pending: {
              type: 'integer',
              description: 'Number of pending reminders'
            },
            overdue: {
              type: 'integer',
              description: 'Number of overdue reminders (should have been sent but werent)'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                message: {
                  type: 'string',
                  description: 'Error message'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        ApiGatewayAuth: [],
        UserHeaders: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/index.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
}; 