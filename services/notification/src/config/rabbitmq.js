const amqp = require('amqplib');
const env = require('./env');
const { logger } = require('./logger');

class RabbitMQManager {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      logger.info('🔌 Connecting to RabbitMQ...', { url: env.RABBITMQ_URL });
      
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      
      // Handle connection events
      this.connection.on('error', (error) => {
        logger.error('❌ RabbitMQ connection error:', { error: error.message });
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('⚠️ RabbitMQ connection closed');
        this.isConnected = false;
      });

      this.isConnected = true;
      logger.info('✅ Connected to RabbitMQ successfully');
      
      return this.channel;
    } catch (error) {
      logger.error('❌ Failed to connect to RabbitMQ:', { error: error.message });
      throw error;
    }
  }

  async setupExchangeAndQueue() {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      // Assert exchange (should already exist from reminder service)
      await this.channel.assertExchange(env.RABBITMQ_EXCHANGE, 'topic', {
        durable: true
      });

      // Assert queue
      await this.channel.assertQueue(env.RABBITMQ_QUEUE, {
        durable: true
      });

      // Bind queue to exchange with routing key for REMINDER_TRIGGERED
      await this.channel.bindQueue(
        env.RABBITMQ_QUEUE,
        env.RABBITMQ_EXCHANGE,
        'reminder.reminder_triggered'
      );

      logger.info('✅ RabbitMQ exchange and queue setup completed', {
        exchange: env.RABBITMQ_EXCHANGE,
        queue: env.RABBITMQ_QUEUE,
        routingKey: 'reminder.reminder_triggered'
      });
    } catch (error) {
      logger.error('❌ Failed to setup RabbitMQ exchange and queue:', { error: error.message });
      throw error;
    }
  }

  async consumeMessages(messageHandler) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      // Set prefetch to process one message at a time
      await this.channel.prefetch(1);

      logger.info('🎧 Starting to consume messages...', { queue: env.RABBITMQ_QUEUE });

      await this.channel.consume(env.RABBITMQ_QUEUE, async (message) => {
        if (!message) return;

        try {
          const content = JSON.parse(message.content.toString());
          const routingKey = message.fields.routingKey;

          logger.info('📨 Received message', {
            routingKey,
            messageId: message.properties.messageId,
            timestamp: message.properties.timestamp
          });

          // Process the message
          await messageHandler(routingKey, content);

          // Acknowledge the message
          this.channel.ack(message);
          
          logger.info('✅ Message processed successfully', { routingKey });
        } catch (error) {
          logger.error('❌ Error processing message:', {
            error: error.message,
            routingKey: message.fields.routingKey
          });

          // Reject message and don't requeue to avoid infinite loops
          this.channel.nack(message, false, false);
        }
      });

    } catch (error) {
      logger.error('❌ Failed to consume messages:', { error: error.message });
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      logger.info('✅ RabbitMQ connection closed gracefully');
    } catch (error) {
      logger.error('❌ Error closing RabbitMQ connection:', { error: error.message });
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      exchange: env.RABBITMQ_EXCHANGE,
      queue: env.RABBITMQ_QUEUE
    };
  }
}

module.exports = new RabbitMQManager(); 