const emailService = require('./emailService');
const reminderHandler = require('../handlers/reminderHandler');
const { logger } = require('../config/logger');

class NotificationService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info('🚀 Initializing notification service...');

      // Initialize email service
      await emailService.initialize();
      
      this.isInitialized = true;
      logger.info('✅ Notification service initialized successfully');
      
    } catch (error) {
      logger.error('❌ Failed to initialize notification service:', { error: error.message });
      throw error;
    }
  }

  /**
   * Process incoming events from RabbitMQ
   */
  async processEvent(routingKey, eventData) {
    try {
      if (!this.isInitialized) {
        throw new Error('Notification service not initialized');
      }

      logger.info('📨 Processing notification event', { 
        routingKey, 
        eventType: eventData.type,
        service: eventData.service 
      });

      // Route events to appropriate handlers based on event type
      switch (eventData.type) {
        case 'REMINDER_TRIGGERED':
          await reminderHandler.processEvent(eventData.type, eventData);
          break;
          
        default:
          logger.warn('⚠️ Unknown event type', { eventType: eventData.type, routingKey });
          break;
      }

      logger.info('✅ Event processed successfully', { routingKey });
      
    } catch (error) {
      logger.error('❌ Error processing event', {
        error: error.message,
        routingKey,
        eventType: eventData?.type
      });
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const emailStatus = await emailService.getConnectionStatus();
      const handlerStatus = await reminderHandler.healthCheck();

      return {
        service: 'notification-service',
        status: this.isInitialized ? 'healthy' : 'not_initialized',
        initialized: this.isInitialized,
        timestamp: new Date().toISOString(),
        components: {
          emailService: emailStatus,
          reminderHandler: handlerStatus
        }
      };
      
    } catch (error) {
      return {
        service: 'notification-service',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('🛑 Shutting down notification service...');

      await emailService.close();
      
      this.isInitialized = false;
      logger.info('✅ Notification service shut down gracefully');
      
    } catch (error) {
      logger.error('❌ Error during notification service shutdown:', { error: error.message });
      throw error;
    }
  }
}

module.exports = new NotificationService(); 