const reminderService = require('../services/reminderService');

class TaskEventHandler {
  constructor() {
    this.eventHandlers = {
      'task.created': this.handleTaskCreated.bind(this),
      'task.updated': this.handleTaskUpdated.bind(this),
      'task.completed': this.handleTaskCompleted.bind(this),
      'task.deleted': this.handleTaskDeleted.bind(this)
    };
  }

  /**
   * Main event processor
   */
  async processEvent(routingKey, eventData) {
    try {
      console.log(`🔄 Processing event: ${routingKey}`);
      
      const handler = this.eventHandlers[routingKey];
      
      if (!handler) {
        console.warn(`⚠️ No handler found for event: ${routingKey}`);
        return;
      }

      await handler(eventData);
      console.log(`✅ Successfully processed event: ${routingKey}`);
    } catch (error) {
      console.error(`❌ Error processing event ${routingKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Handle task created event
   * Creates a new reminder if task has a due date
   */
  async handleTaskCreated(eventData) {
    try {
      const { data } = eventData;
      
      // Use taskId field from the event data
      const taskId = data?.taskId || data?.id;
      if (!data || !taskId) {
        throw new Error('Invalid task created event data');
      }

      // Only create reminder if task has a due date
      if (!data.dueDate) {
        console.log(`⚠️ Task ${taskId} has no due date, skipping reminder creation`);
        return;
      }

      console.log('🔍 Task event data received:', {
        taskId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status
      });

      const taskData = {
        id: taskId,
        userId: data.userId,
        dueDate: data.dueDate,
        remindBefore: data.remindBefore || 30, // Default 30 minutes before
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        status: data.status || 'pending'
      };

      console.log('🔍 Task data being passed to reminder service:', taskData);

      await reminderService.createReminder(taskData);
      
    } catch (error) {
      console.error('❌ Error handling task created event:', error.message);
      throw error;
    }
  }

  /**
   * Handle task updated event
   * Updates existing reminder or creates new one
   */
  async handleTaskUpdated(eventData) {
    try {
      const { data } = eventData;
      
      // Use taskId field from the event data
      const taskId = data?.taskId || data?.id;
      if (!data || !taskId) {
        throw new Error('Invalid task updated event data');
      }

      // If task no longer has due date, delete reminder
      if (!data.dueDate) {
        console.log(`⚠️ Task ${taskId} no longer has due date, deleting reminder`);
        await reminderService.deleteReminder(taskId);
        return;
      }

      const taskData = {
        id: taskId,
        userId: data.userId,
        dueDate: data.dueDate,
        remindBefore: data.remindBefore || 30,
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        status: data.status || 'pending'
      };

      await reminderService.updateReminder(taskData);
      
    } catch (error) {
      console.error('❌ Error handling task updated event:', error.message);
      throw error;
    }
  }

  /**
   * Handle task completed event
   * Deletes the reminder since task is done
   */
  async handleTaskCompleted(eventData) {
    try {
      const { data } = eventData;
      
      // Use taskId field from the event data
      const taskId = data?.taskId || data?.id;
      if (!data || !taskId) {
        throw new Error('Invalid task completed event data');
      }

      await reminderService.deleteReminder(taskId);
      
    } catch (error) {
      console.error('❌ Error handling task completed event:', error.message);
      throw error;
    }
  }

  /**
   * Handle task deleted event
   * Deletes the reminder since task no longer exists
   */
  async handleTaskDeleted(eventData) {
    try {
      const { data } = eventData;
      
      // Use taskId field from the event data
      const taskId = data?.taskId || data?.id;
      if (!data || !taskId) {
        throw new Error('Invalid task deleted event data');
      }

      await reminderService.deleteReminder(taskId);
      
    } catch (error) {
      console.error('❌ Error handling task deleted event:', error.message);
      throw error;
    }
  }

  /**
   * Get supported event types
   */
  getSupportedEvents() {
    return Object.keys(this.eventHandlers);
  }
}

module.exports = new TaskEventHandler(); 