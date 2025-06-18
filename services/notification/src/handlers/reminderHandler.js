const emailService = require('../services/emailService');
const { logger } = require('../config/logger');

class ReminderHandler {
  constructor() {
    this.eventHandlers = {
      'REMINDER_TRIGGERED': this.handleReminderTriggered.bind(this)
    };
  }

  /**
   * Main event processor for reminder events
   */
  async processEvent(eventType, eventData) {
    try {
      logger.info('🔄 Processing reminder event', { 
        eventType, 
        dataType: eventData.type 
      });
      
      const handler = this.eventHandlers[eventType];
      
      if (!handler) {
        logger.warn('⚠️ No handler found for event', { eventType });
        return;
      }

      await handler(eventData);
      logger.info('✅ Successfully processed reminder event', { eventType });
      
    } catch (error) {
      logger.error('❌ Error processing reminder event', {
        error: error.message,
        eventType,
        dataType: eventData.type
      });
      throw error;
    }
  }

  /**
   * Handle REMINDER_TRIGGERED event
   * This is the main event that triggers email notifications
   */
  async handleReminderTriggered(eventData) {
    try {
      const { data } = eventData;
      
      // Validate event data
      if (!data || !data.reminderId || !data.taskId || !data.userId) {
        throw new Error('Invalid REMINDER_TRIGGERED event data');
      }

      logger.info('📧 Processing reminder triggered event', {
        reminderId: data.reminderId,
        taskId: data.taskId,
        userId: data.userId,
        dueDate: data.dueDate
      });

      // Prepare email data
      const emailData = {
        userId: data.userId,
        taskId: data.taskId,
        dueDate: data.dueDate,
        message: data.message || `Your task is due at ${new Date(data.dueDate).toLocaleString()}`,
        title: data.title || data.taskTitle || 'Untitled Task',
        description: data.description || data.taskDescription || null,
        priority: data.priority || data.taskPriority || 'medium',
        status: data.status || data.taskStatus || 'pending'
      };

      // Send reminder email
      const result = await emailService.sendReminderEmail(emailData);
      
      logger.info('✅ Reminder email sent successfully', {
        reminderId: data.reminderId,
        taskId: data.taskId,
        userId: data.userId,
        messageId: result.messageId,
        email: result.email
      });

      // TODO: Save notification record to database
      // await this.saveNotificationRecord(data, result);

      return result;
      
    } catch (error) {
      logger.error('❌ Error handling reminder triggered event', {
        error: error.message,
        reminderId: eventData.data?.reminderId,
        taskId: eventData.data?.taskId,
        userId: eventData.data?.userId
      });
      throw error;
    }
  }

  /**
   * Save notification record to database (for future implementation)
   */
  async saveNotificationRecord(reminderData, emailResult) {
    try {
      // TODO: Implement database logging
      // const notificationRecord = {
      //   userId: reminderData.userId,
      //   type: 'reminder',
      //   channel: 'email',
      //   subject: 'Task Reminder',
      //   message: reminderData.message,
      //   data: {
      //     taskId: reminderData.taskId,
      //     reminderId: reminderData.reminderId,
      //     dueDate: reminderData.dueDate
      //   },
      //   status: 'sent',
      //   sentAt: new Date(),
      //   messageId: emailResult.messageId
      // };
      
      // await notificationRepo.create(notificationRecord);
      
      logger.info('📝 Notification record saved', {
        userId: reminderData.userId,
        messageId: emailResult.messageId
      });
      
    } catch (error) {
      logger.error('❌ Failed to save notification record', {
        error: error.message,
        userId: reminderData.userId
      });
      // Don't throw error - notification was sent successfully
    }
  }

  /**
   * Get supported event types
   */
  getSupportedEvents() {
    return Object.keys(this.eventHandlers);
  }

  /**
   * Health check for the handler
   */
  async healthCheck() {
    try {
      // Check email service status
      const emailStatus = await emailService.getConnectionStatus();
      
      return {
        status: 'healthy',
        supportedEvents: this.getSupportedEvents(),
        emailService: emailStatus
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        supportedEvents: this.getSupportedEvents()
      };
    }
  }
}

module.exports = new ReminderHandler(); 