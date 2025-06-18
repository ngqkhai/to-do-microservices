const amqp = require('amqplib');
const { logger } = require('../config/logger');

class RabbitMQManager {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.EXCHANGE_NAME = 'task-events';
    this.EXCHANGE_TYPE = 'topic'; // Changed to topic for routing
  }

  async connect() {
    try {
      if (!this.connection) {
        this.connection = await amqp.connect(process.env.RABBITMQ_URL);
        logger.info('RabbitMQ connection established');

        // Handle connection errors
        this.connection.on('error', (err) => {
          logger.error('RabbitMQ connection error:', err);
          this.connection = null;
          this.channel = null;
        });

        this.connection.on('close', () => {
          logger.warn('RabbitMQ connection closed');
          this.connection = null;
          this.channel = null;
        });
      }
      return this.connection;
    } catch (error) {
      logger.error('Failed to establish RabbitMQ connection:', error);
      throw error;
    }
  }

  async getChannel() {
    try {
      if (!this.channel) {
        const conn = await this.connect();
        this.channel = await conn.createChannel();
        
        // Declare exchange with topic routing
        await this.channel.assertExchange(this.EXCHANGE_NAME, this.EXCHANGE_TYPE, {
          durable: true
        });
        
        logger.info('RabbitMQ channel created and exchange declared');
      }
      return this.channel;
    } catch (error) {
      logger.error('Failed to create RabbitMQ channel:', error);
      throw error;
    }
  }

  async publishReminderEvent(eventType, data) {
    try {
      const ch = await this.getChannel();
      
      // Create the event message according to the specified format
      const eventMessage = {
        type: eventType,
        data: {
          taskId: data.taskId || data.id,
          userId: data.userId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate,
          remindBefore: data.remindBefore || 30, // Default 30 minutes
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        },
        service: 'task-service',
        timestamp: new Date().toISOString()
      };

      const success = ch.publish(
        this.EXCHANGE_NAME,
        eventType, // Use eventType as routing key (task.created, task.updated, etc.)
        Buffer.from(JSON.stringify(eventMessage)),
        { persistent: true }
      );

      if (success) {
        logger.info('Event published to RabbitMQ', {
          exchange: this.EXCHANGE_NAME,
          routingKey: eventType,
          eventType,
          taskId: data.taskId || data.id,
          userId: data.userId
        });
      } else {
        throw new Error('Failed to publish event to RabbitMQ');
      }

      return true;
    } catch (error) {
      logger.error('Failed to publish event to RabbitMQ:', {
        error: error.message,
        eventType,
        taskId: data.taskId || data.id
      });
      throw error;
    }
  }

  async publishTaskEvent(eventType, taskData) {
    return this.publishReminderEvent(eventType, taskData);
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}

// Export singleton instance
const rabbitmqManager = new RabbitMQManager();

module.exports = rabbitmqManager; 