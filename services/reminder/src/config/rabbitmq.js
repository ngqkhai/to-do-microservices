const amqp = require('amqplib');
const env = require('./env');

class RabbitMQManager {
  constructor() {
    this.connection = null;
    this.publishChannel = null;
    this.consumeChannel = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('Connecting to RabbitMQ...');
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      
      // Create channels
      this.publishChannel = await this.connection.createChannel();
      this.consumeChannel = await this.connection.createChannel();
      
      // Declare exchanges
      await this.publishChannel.assertExchange(env.TASK_EVENTS_EXCHANGE, env.EXCHANGE_TYPE, { durable: env.QUEUE_DURABLE });
      await this.publishChannel.assertExchange(env.REMINDER_EVENTS_EXCHANGE, env.EXCHANGE_TYPE, { durable: env.QUEUE_DURABLE });
      
      this.isConnected = true;
      console.log('✅ RabbitMQ connected successfully');
      
      // Handle connection errors
      this.connection.on('error', (error) => {
        console.error('❌ RabbitMQ connection error:', error.message);
        this.isConnected = false;
      });
      
      this.connection.on('close', () => {
        console.warn('⚠️ RabbitMQ connection closed');
        this.isConnected = false;
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async subscribeToTaskEvents(onMessage) {
    try {
      if (!this.isConnected || !this.consumeChannel) {
        throw new Error('RabbitMQ not connected');
      }

      // Create a queue for this service
      const queue = env.QUEUE_NAME;
      await this.consumeChannel.assertQueue(queue, { durable: env.QUEUE_DURABLE });
      
      // Bind queue to task events exchange with routing patterns
      const routingKeys = env.TASK_ROUTING_KEYS;
      
      for (const routingKey of routingKeys) {
        await this.consumeChannel.bindQueue(queue, env.TASK_EVENTS_EXCHANGE, routingKey);
      }
      
      // Set prefetch to process messages
      await this.consumeChannel.prefetch(env.PREFETCH_COUNT);
      
      // Start consuming
      await this.consumeChannel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            const routingKey = msg.fields.routingKey;
            
            console.log(`📨 Received task event: ${routingKey}`, content);
            
            await onMessage(routingKey, content);
            
            // Acknowledge message
            this.consumeChannel.ack(msg);
          } catch (error) {
            console.error('❌ Error processing task event:', error.message);
            // Reject and requeue the message
            this.consumeChannel.nack(msg, false, true);
          }
        }
      });
      
      console.log('✅ Subscribed to task events');
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to task events:', error.message);
      return false;
    }
  }

  async publishReminderEvent(eventType, data) {
    try {
      if (!this.isConnected || !this.publishChannel) {
        throw new Error('RabbitMQ not connected');
      }

      const routingKey = `reminder.${eventType.toLowerCase()}`;
      const message = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        service: 'reminder-service'
      };

      await this.publishChannel.publish(
        env.REMINDER_EVENTS_EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: env.MESSAGE_PERSISTENT }
      );

      console.log(`📤 Published reminder event: ${routingKey}`, message);
      return true;
    } catch (error) {
      console.error('❌ Failed to publish reminder event:', error.message);
      return false;
    }
  }

  async close() {
    try {
      if (this.publishChannel) {
        await this.publishChannel.close();
      }
      if (this.consumeChannel) {
        await this.consumeChannel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      
      this.isConnected = false;
      console.log('✅ RabbitMQ connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing RabbitMQ connection:', error.message);
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      hasPublishChannel: !!this.publishChannel,
      hasConsumeChannel: !!this.consumeChannel
    };
  }
}

module.exports = new RabbitMQManager(); 