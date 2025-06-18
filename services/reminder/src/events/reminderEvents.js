const rabbitmq = require('../config/rabbitmq');
const { logger } = require('../config/logger');

class ReminderEvents {
  /**
   * Publish reminder triggered event
   * This is the ONLY event that matters - when a reminder needs to be sent to the user
   */
  static async publishReminderTriggered(reminderData) {
    try {
      await rabbitmq.publishReminderEvent('REMINDER_TRIGGERED', reminderData);
      logger.info('Published REMINDER_TRIGGERED event', {
        reminderId: reminderData.reminderId,
        taskId: reminderData.taskId,
        userId: reminderData.userId
      });
    } catch (error) {
      logger.error('Failed to publish REMINDER_TRIGGERED event', {
        error: error.message,
        reminderData
      });
      throw error;
    }
  }
}

module.exports = ReminderEvents; 