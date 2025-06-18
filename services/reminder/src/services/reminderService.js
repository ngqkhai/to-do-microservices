const { v4: uuidv4 } = require('uuid');
const reminderRepo = require('../repositories/reminderRepo');
const rabbitmq = require('../config/rabbitmq');
const ReminderEvents = require('../events/reminderEvents');
const { logger } = require('../config/logger');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ReminderService {
  constructor() {
    this.scannerInterval = null;
  }

  /**
   * Create a new reminder from task event
   */
  async createReminder(taskData) {
    try {
      const { 
        id: taskId, 
        userId, 
        dueDate, 
        remindBefore = 30,
        title,
        description,
        priority = 'medium',
        status = 'pending'
      } = taskData;
      
      if (!taskId || !userId || !dueDate) {
        throw new ValidationError('Missing required fields: taskId, userId, or dueDate');
      }

      const reminderTime = this.calculateReminderTime(dueDate, remindBefore);
      
      const reminderData = {
        taskId,
        userId,
        dueDate: new Date(dueDate),
        remindBefore,
        reminderTime,
        taskTitle: title,
        taskDescription: description,
        taskPriority: priority,
        taskStatus: status
      };

      const reminder = await reminderRepo.create(reminderData);
      
      logger.info(`✅ Created reminder for task "${title || taskId}", due at ${reminderTime}`);
      return reminder;
    } catch (error) {
      logger.error('❌ Error creating reminder:', error.message);
      throw error;
    }
  }

  /**
   * Update existing reminder
   */
  async updateReminder(taskData) {
    try {
      const { 
        id: taskId, 
        dueDate, 
        remindBefore = 30,
        title,
        description,
        priority,
        status
      } = taskData;
      
      if (!taskId) {
        throw new ValidationError('Missing taskId for reminder update');
      }

      const existing = await reminderRepo.findByTaskId(taskId);
      
      if (!existing) {
        logger.info(`⚠️ No reminder found for task ${taskId}, creating new one`);
        return await this.createReminder(taskData);
      }

      const updates = {};

      if (dueDate) {
        updates.dueDate = new Date(dueDate);
        updates.reminderTime = this.calculateReminderTime(dueDate, remindBefore);
        updates.sent = false; // Reset sent status if due date changed
      }

      if (remindBefore !== undefined) {
        updates.remindBefore = remindBefore;
        updates.reminderTime = this.calculateReminderTime(
          updates.dueDate || existing.dueDate, 
          remindBefore
        );
        updates.sent = false; // Reset sent status if reminder time changed
      }

      // Update task details
      if (title !== undefined) updates.taskTitle = title;
      if (description !== undefined) updates.taskDescription = description;
      if (priority !== undefined) updates.taskPriority = priority;
      if (status !== undefined) updates.taskStatus = status;

      const updatedReminder = await reminderRepo.updateByTaskId(taskId, updates);
      
      logger.info(`✅ Updated reminder for task "${title || taskId}"`);
      return updatedReminder;
    } catch (error) {
      logger.error('❌ Error updating reminder:', error.message);
      throw error;
    }
  }

  /**
   * Delete reminder for completed/deleted task
   */
  async deleteReminder(taskId) {
    try {
      if (!taskId) {
        throw new ValidationError('Missing taskId for reminder deletion');
      }

      const existing = await reminderRepo.findByTaskId(taskId);
      const deleted = await reminderRepo.deleteByTaskId(taskId);
      
      if (deleted > 0 && existing) {
        logger.info(`✅ Deleted reminder for task ${taskId}`);
      } else {
        logger.info(`⚠️ No reminder found to delete for task ${taskId}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error('❌ Error deleting reminder:', error.message);
      throw error;
    }
  }

  /**
   * Calculate reminder time based on due date and remind_before minutes
   */
  calculateReminderTime(dueDate, remindBeforeMinutes) {
    const due = new Date(dueDate);
    const reminderTime = new Date(due.getTime() - (remindBeforeMinutes * 60 * 1000));
    
    console.log(`🕐 Calculating reminder time:`);
    console.log(`  - Due Date: ${due.toISOString()} (UTC)`);
    console.log(`  - Remind Before: ${remindBeforeMinutes} minutes`);
    console.log(`  - Reminder Time: ${reminderTime.toISOString()} (UTC)`);
    
    return reminderTime;
  }

  /**
   * Scan for due reminders and trigger them
   */
  async scanAndTriggerReminders() {
    try {
      const dueReminders = await reminderRepo.findDueReminders();

      if (dueReminders.length === 0) {
        return { triggered: 0, message: 'No due reminders found' };
      }

      logger.info(`⏰ Found ${dueReminders.length} due reminders`);

      let triggered = 0;
      for (const reminder of dueReminders) {
        try {
          await this.triggerReminder(reminder);
          triggered++;
        } catch (error) {
          logger.error(`❌ Failed to trigger reminder ${reminder.id}:`, error.message);
        }
      }

      return { triggered, total: dueReminders.length };
    } catch (error) {
      logger.error('❌ Error scanning for due reminders:', error.message);
      throw error;
    }
  }

  /**
   * Trigger a specific reminder
   */
  async triggerReminder(reminder) {
    try {
      console.log('🔍 Raw reminder data from database:', {
        id: reminder.id,
        taskId: reminder.taskId || reminder.task_id,
        taskTitle: reminder.taskTitle,
        task_title: reminder.task_title,
        taskDescription: reminder.taskDescription,
        task_description: reminder.task_description,
        taskPriority: reminder.taskPriority,
        task_priority: reminder.task_priority,
        taskStatus: reminder.taskStatus,
        task_status: reminder.task_status
      });

      // Publish reminder event with task details
      const eventData = {
        reminderId: reminder.id,
        taskId: reminder.taskId || reminder.task_id,
        userId: reminder.userId || reminder.user_id,
        dueDate: reminder.dueDate || reminder.due_date,
        message: `Task reminder: Your task "${reminder.taskTitle || reminder.task_title || 'Untitled'}" is due at ${(reminder.dueDate || reminder.due_date).toLocaleString()}`,
        title: reminder.taskTitle || reminder.task_title,
        description: reminder.taskDescription || reminder.task_description,
        priority: reminder.taskPriority || reminder.task_priority || 'medium',
        status: reminder.taskStatus || reminder.task_status || 'pending'
      };
      
      console.log('🔍 Event data:', eventData);
      await ReminderEvents.publishReminderTriggered(eventData);

      // Mark as sent
      await reminderRepo.markAsSent(reminder.id);

      logger.info(`✅ Triggered reminder ${reminder.id} for task "${eventData.title || eventData.taskId}"`);
      return true;
    } catch (error) {
      logger.error(`❌ Error triggering reminder ${reminder.id}:`, error.message);
      throw error;
    }
  }

  /**
   * Start the periodic reminder scanner
   */
  startScanner(intervalMs) {
    if (this.scannerInterval) {
      logger.info('⚠️ Scanner already running');
      return;
    }

    logger.info(`🕐 Starting reminder scanner (interval: ${intervalMs}ms)`);
    
    this.scannerInterval = setInterval(async () => {
      try {
        const result = await this.scanAndTriggerReminders();
        if (result.triggered > 0) {
          logger.info(`⏰ Scanner triggered ${result.triggered} reminders`);
        }
      } catch (error) {
        logger.error('❌ Scanner error:', error.message);
      }
    }, intervalMs);

    // Also run immediately
    this.scanAndTriggerReminders().catch(error => {
      logger.error('❌ Initial scan error:', error.message);
    });
  }

  /**
   * Stop the periodic reminder scanner
   */
  stopScanner() {
    if (this.scannerInterval) {
      clearInterval(this.scannerInterval);
      this.scannerInterval = null;
      logger.info('🛑 Reminder scanner stopped');
    }
  }

  /**
   * Get all reminders (admin function)
   */
  async getAllReminders(options = {}) {
    try {
      const result = await reminderRepo.findAll(options);

      logger.info(`📋 Retrieved ${result.count} total reminders`);
      return {
        reminders: result.rows,
        total: result.count,
        limit: options.limit || 50,
        offset: options.offset || 0
      };
    } catch (error) {
      logger.error('❌ Error retrieving all reminders:', error.message);
      throw error;
    }
  }

  /**
   * Get reminders for a specific user
   */
  async getUserReminders(userId, options = {}) {
    try {
      let result;
      
      if (options.status === 'pending') {
        result = await reminderRepo.findPendingByUser(userId, options);
      } else if (options.status === 'sent') {
        result = await reminderRepo.findSentByUser(userId, options);
      } else {
        result = await reminderRepo.findAllByUser(userId, options);
      }

      logger.info(`📋 Retrieved ${result.count} reminders for user ${userId}`);
      return {
        reminders: result.rows,
        total: result.count,
        limit: options.limit || 50,
        offset: options.offset || 0
      };
    } catch (error) {
      logger.error('❌ Error getting user reminders:', error.message);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  async getStats() {
    try {
      const stats = await reminderRepo.getStats();

      logger.info('📊 Retrieved reminder statistics');
      return stats;
    } catch (error) {
      logger.error('❌ Error getting stats:', error.message);
      throw error;
    }
  }
}

module.exports = new ReminderService(); 