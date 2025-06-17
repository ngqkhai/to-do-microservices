const amqp = require('amqplib');
const env = require('../config/env');

class EventPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      
      // Set up connection event handlers
      this.connection.on('error', (error) => {
        console.error('RabbitMQ connection error:', error);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
        this.isConnected = false;
      });

      // Declare exchanges
      await this.setupExchanges();
      
      this.isConnected = true;
      console.log('RabbitMQ connected successfully');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async setupExchanges() {
    // Declare the main events exchange
    await this.channel.assertExchange('auth.events', 'topic', {
      durable: true
    });

    // Declare dead letter exchange for failed events
    await this.channel.assertExchange('auth.events.dlx', 'topic', {
      durable: true
    });
  }

  async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async publish(exchange, routingKey, message, options = {}) {
    try {
      await this.ensureConnection();

      const messageBuffer = Buffer.from(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));

      const publishOptions = {
        persistent: true,
        timestamp: Date.now(),
        messageId: require('uuid').v4(),
        ...options
      };

      const published = this.channel.publish(
        exchange,
        routingKey,
        messageBuffer,
        publishOptions
      );

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

      console.log(`Event published: ${routingKey}`, { messageId: publishOptions.messageId });
      return true;
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw error;
    }
  }

  async publishUserRegistered(userData) {
    const event = {
      eventType: 'UserRegistered',
      data: {
        userId: userData.userId,
        email: userData.email,
        fullName: userData.fullName,
        roles: userData.roles,
        registeredAt: userData.registeredAt
      }
    };

    return this.publish('auth.events', 'user.registered', event);
  }

  async publishUserLoggedIn(userData) {
    const event = {
      eventType: 'UserLoggedIn',
      data: {
        userId: userData.userId,
        email: userData.email,
        loginAt: userData.loginAt,
        ipAddress: userData.ipAddress,
        userAgent: userData.userAgent
      }
    };

    return this.publish('auth.events', 'user.logged_in', event);
  }

  async publishUserLoggedOut(userData) {
    const event = {
      eventType: 'UserLoggedOut',
      data: {
        userId: userData.userId,
        email: userData.email,
        logoutAt: userData.logoutAt
      }
    };

    return this.publish('auth.events', 'user.logged_out', event);
  }

  async publishPasswordChanged(userData) {
    const event = {
      eventType: 'PasswordChanged',
      data: {
        userId: userData.userId,
        email: userData.email,
        changedAt: userData.changedAt
      }
    };

    return this.publish('auth.events', 'user.password_changed', event);
  }

  async publishAccountDeactivated(userData) {
    const event = {
      eventType: 'AccountDeactivated',
      data: {
        userId: userData.userId,
        email: userData.email,
        deactivatedAt: userData.deactivatedAt,
        reason: userData.reason
      }
    };

    return this.publish('auth.events', 'user.account_deactivated', event);
  }

  async publishEmailVerified(userData) {
    const event = {
      eventType: 'EmailVerified',
      data: {
        userId: userData.userId,
        email: userData.email,
        verifiedAt: userData.verifiedAt
      }
    };

    return this.publish('auth.events', 'user.email_verified', event);
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
      console.log('RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }

  // Health check method
  isHealthy() {
    return this.isConnected && this.connection && this.channel;
  }
}

// Create singleton instance
const eventPublisher = new EventPublisher();

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('Closing RabbitMQ connection...');
  await eventPublisher.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing RabbitMQ connection...');
  await eventPublisher.close();
  process.exit(0);
});

// Export individual functions for easier testing and usage
module.exports = {
  eventPublisher,
  publishUserRegistered: (userData) => eventPublisher.publishUserRegistered(userData),
  publishUserLoggedIn: (userData) => eventPublisher.publishUserLoggedIn(userData),
  publishUserLoggedOut: (userData) => eventPublisher.publishUserLoggedOut(userData),
  publishPasswordChanged: (userData) => eventPublisher.publishPasswordChanged(userData),
  publishAccountDeactivated: (userData) => eventPublisher.publishAccountDeactivated(userData),
  publishEmailVerified: (userData) => eventPublisher.publishEmailVerified(userData),
  connectEventPublisher: () => eventPublisher.connect(),
  closeEventPublisher: () => eventPublisher.close(),
  isEventPublisherHealthy: () => eventPublisher.isHealthy()
}; 