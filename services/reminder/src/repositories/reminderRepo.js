const { Reminder } = require('../models');
const { Op } = require('sequelize');

class ReminderRepository {
  async create(reminderData) {
    console.log('🔍 Repository receiving data:', reminderData);
    
    const reminderRecord = {
      taskId: reminderData.taskId,
      userId: reminderData.userId,
      dueDate: reminderData.dueDate,
      remindBefore: reminderData.remindBefore || 30,
      reminderTime: reminderData.reminderTime,
      sent: false,
      taskTitle: reminderData.taskTitle,
      taskDescription: reminderData.taskDescription,
      taskPriority: reminderData.taskPriority,
      taskStatus: reminderData.taskStatus
    };
    
    console.log('🔍 Repository creating reminder with:', reminderRecord);
    
    return Reminder.create(reminderRecord);
  }

  async findById(id) {
    return Reminder.findByPk(id);
  }

  async findByTaskId(taskId) {
    return Reminder.findOne({
      where: { taskId }
    });
  }

  async updateByTaskId(taskId, updateData) {
    const [updatedRowsCount] = await Reminder.update(updateData, {
      where: { taskId }
    });
    
    if (updatedRowsCount === 0) {
      return null;
    }
    
    return this.findByTaskId(taskId);
  }

  async deleteByTaskId(taskId) {
    return Reminder.destroy({
      where: { taskId }
    });
  }

  async findAllByUser(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      order = [['createdAt', 'DESC']]
    } = options;

    return Reminder.findAndCountAll({
      where: { userId },
      limit,
      offset,
      order
    });
  }

  async findDueReminders() {
    const now = new Date();
    console.log(`🔍 Scanner checking for reminders due before: ${now.toISOString()} (UTC)`);
    
    // First, let's see all pending reminders for debugging
    const allPending = await Reminder.findAll({
      where: { sent: false },
      order: [['reminderTime', 'ASC']]
    });
    
    console.log(`📋 Found ${allPending.length} pending reminders:`);
    allPending.forEach(reminder => {
      const reminderTimeUTC = new Date(reminder.reminderTime).toISOString();
      const isPastDue = new Date(reminder.reminderTime) <= now;
      console.log(`  - Reminder ${reminder.id}: ${reminderTimeUTC} (Past due: ${isPastDue})`);
    });
    
    return Reminder.findAll({
      where: {
        reminderTime: {
          [Op.lte]: now
        },
        sent: false
      },
      order: [['reminderTime', 'ASC']]
    });
  }

  async markAsSent(id) {
    return Reminder.update(
      { 
        sent: true,
        updatedAt: new Date()
      },
      { 
        where: { id } 
      }
    );
  }

  async findPendingByUser(userId, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return Reminder.findAndCountAll({
      where: {
        userId,
        sent: false
      },
      limit,
      offset,
      order: [['reminderTime', 'ASC']]
    });
  }

  async findSentByUser(userId, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return Reminder.findAndCountAll({
      where: {
        userId,
        sent: true
      },
      limit,
      offset,
      order: [['updatedAt', 'DESC']]
    });
  }

  async getStats() {
    const total = await Reminder.count();
    const sent = await Reminder.count({ where: { sent: true } });
    const pending = await Reminder.count({ where: { sent: false } });
    
    const now = new Date();
    const overdue = await Reminder.count({
      where: {
        reminderTime: {
          [Op.lt]: now
        },
        sent: false
      }
    });

    return {
      total,
      sent,
      pending,
      overdue
    };
  }

  async findAll(options = {}) {
    const {
      limit = 50,
      offset = 0,
      order = [['createdAt', 'DESC']]
    } = options;

    return Reminder.findAndCountAll({
      limit,
      offset,
      order
    });
  }
}

module.exports = new ReminderRepository(); 