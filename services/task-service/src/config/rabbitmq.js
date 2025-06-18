const amqp = require('amqplib');
const { logger } = require('./logger');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'task-events';
const EXCHANGE_TYPE = 'topic';

const getRabbitMQConnection = async () => {
  try {
    if (!connection) {
      connection = await amqp.connect(process.env.RABBITMQ_URL);
      logger.info('RabbitMQ connection established');

      // Handle connection errors
      connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        connection = null;
        channel = null;
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        connection = null;
        channel = null;
      });
    }
    return connection;
  } catch (error) {
    logger.error('Failed to establish RabbitMQ connection:', error);
    throw error;
  }
};

const getChannel = async () => {
  try {
    if (!channel) {
      const conn = await getRabbitMQConnection();
      channel = await conn.createChannel();
      
      // Declare exchange
      await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
        durable: true
      });
      
      logger.info('RabbitMQ channel created and exchange declared');
    }
    return channel;
  } catch (error) {
    logger.error('Failed to create RabbitMQ channel:', error);
    throw error;
  }
};

const publishEvent = async (routingKey, message) => {
  try {
    const ch = await getChannel();
    const success = ch.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    if (success) {
      logger.info('Message published to RabbitMQ', {
        exchange: EXCHANGE_NAME,
        routingKey,
        message
      });
    } else {
      throw new Error('Failed to publish message to RabbitMQ');
    }
  } catch (error) {
    logger.error('Failed to publish message to RabbitMQ:', error);
    throw error;
  }
};

const setupRabbitMQ = async () => {
  try {
    await getRabbitMQConnection();
    await getChannel();
    logger.info('RabbitMQ setup completed');
  } catch (error) {
    logger.error('Failed to setup RabbitMQ:', error);
    throw error;
  }
};

module.exports = {
  getRabbitMQConnection,
  getChannel,
  publishEvent,
  setupRabbitMQ,
  EXCHANGE_NAME,
  EXCHANGE_TYPE
}; 