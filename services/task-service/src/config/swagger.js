const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Service API',
      version: '1.0.0',
      description: 'API documentation for the Task Service',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'User ID from API Gateway (Required). Additional headers: x-user-email, x-user-full-name, x-user-roles, x-user-email-verified'
        }
      },
      schemas: {
        Task: {
          type: 'object',
          required: ['title'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The task ID',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            user_id: {
              type: 'string',
              description: 'The ID of the user who owns the task',
              example: 'user-123'
            },
            title: {
              type: 'string',
              description: 'The task title',
              example: 'Complete project documentation'
            },
            description: {
              type: 'string',
              description: 'The task description',
              example: 'Write comprehensive documentation for the new feature'
            },
            due_date: {
              type: 'string',
              format: 'date-time',
              description: 'The task due date',
              example: '2024-03-20T15:30:00.000Z'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority',
              example: 'high'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'Task status',
              example: 'pending'
            },
            remindBefore: {
              type: 'integer',
              description: 'Minutes before due date to send reminder',
              example: 30
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Task creation timestamp',
              example: '2024-03-18T10:00:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Task last update timestamp',
              example: '2024-03-18T12:30:00.000Z'
            }
          },
          example: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            user_id: 'user-123',
            title: 'Complete project documentation',
            description: 'Write comprehensive documentation for the new feature',
            due_date: '2024-03-20T15:30:00.000Z',
            priority: 'high',
            status: 'pending',
            remindBefore: 30,
            created_at: '2024-03-18T10:00:00.000Z',
            updated_at: '2024-03-18T12:30:00.000Z'
          }
        },
        CreateTaskRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              description: 'Task title',
              example: 'Complete project documentation'
            },
            description: {
              type: 'string',
              description: 'Task description',
              example: 'Write comprehensive documentation for the new feature'
            },
            due_date: {
              type: 'string',
              format: 'date-time',
              description: 'Task due date',
              example: '2024-03-20T15:30:00.000Z'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority',
              example: 'high'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'Task status',
              example: 'pending'
            },
            remindBefore: {
              type: 'integer',
              description: 'Minutes before due date to send reminder',
              example: 30
            }
          },
          example: {
            title: 'Complete project documentation',
            description: 'Write comprehensive documentation for the new feature',
            due_date: '2024-03-20T15:30:00.000Z',
            priority: 'high',
            status: 'pending',
            remindBefore: 30
          }
        },
        UpdateTaskRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title',
              example: 'Updated task title'
            },
            description: {
              type: 'string',
              description: 'Task description',
              example: 'Updated task description'
            },
            due_date: {
              type: 'string',
              format: 'date-time',
              description: 'Task due date',
              example: '2024-03-21T16:00:00.000Z'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority',
              example: 'medium'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'Task status',
              example: 'in_progress'
            },
            remindBefore: {
              type: 'integer',
              description: 'Minutes before due date to send reminder',
              example: 45
            }
          },
          example: {
            title: 'Updated task title',
            description: 'Updated task description',
            due_date: '2024-03-21T16:00:00.000Z',
            priority: 'medium',
            status: 'in_progress',
            remindBefore: 45
          }
        },
        UpdatePriorityRequest: {
          type: 'object',
          required: ['priority'],
          properties: {
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'New task priority',
              example: 'high'
            }
          },
          example: {
            priority: 'high'
          }
        },
        UpdateDueDateRequest: {
          type: 'object',
          required: ['dueDate'],
          properties: {
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'New task due date',
              example: '2024-03-25T14:00:00.000Z'
            }
          },
          example: {
            dueDate: '2024-03-25T14:00:00.000Z'
          }
        },
        Error: {
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
  },
  apis: ['./src/routes/*.js'] // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs; 