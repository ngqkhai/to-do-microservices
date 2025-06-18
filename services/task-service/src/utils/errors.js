class ServiceError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ServiceError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class NotFoundError extends ServiceError {
  constructor(message) {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends ServiceError {
  constructor(message) {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class DatabaseError extends ServiceError {
  constructor(message) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class RabbitMQError extends ServiceError {
  constructor(message) {
    super(message, 500, 'RABBITMQ_ERROR');
  }
}

class RegistryError extends ServiceError {
  constructor(message) {
    super(message, 500, 'REGISTRY_ERROR');
  }
}

function handleError(error) {
  if (error instanceof ServiceError) {
    return {
      statusCode: error.statusCode,
      error: {
        code: error.code,
        message: error.message
      }
    };
  }

  // Handle known error types
  if (error.code === 'ECONNREFUSED') {
    return {
      statusCode: 503,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is currently unavailable'
      }
    };
  }

  // Default error response
  return {
    statusCode: 500,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  };
}

module.exports = {
  ServiceError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  DatabaseError,
  RabbitMQError,
  RegistryError,
  handleError
}; 