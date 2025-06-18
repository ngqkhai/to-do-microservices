const { DataTypes } = require('sequelize');
const rabbitmq = require('../messaging/rabbitmq');
const { logger } = require('../config/logger');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'userId', // Explicitly map to camelCase column name
      comment: 'User ID from the user service, no foreign key constraint'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
      defaultValue: 'pending',
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'medium',
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dueDate' // Explicitly map to camelCase column name
    },
    remindBefore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 30,
      field: 'remindBefore',
      comment: 'Minutes before due date to send reminder'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completedAt' // Explicitly map to camelCase column name
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'createdAt' // Explicitly map to camelCase column name
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updatedAt' // Explicitly map to camelCase column name
    }
  }, {
    tableName: 'tasks',
    timestamps: true,
    underscored: false, // Keep camelCase field names
    indexes: [
      {
        name: 'tasks_user_id_idx',
        fields: ['userId']
      },
      {
        name: 'tasks_status_idx',
        fields: ['status']
      },
      {
        name: 'tasks_priority_idx',
        fields: ['priority']
      },
      {
        name: 'tasks_due_date_idx',
        fields: ['dueDate']
      }
    ]
  });

  // No associations needed as we're following microservices principles
  Task.associate = () => {};

  // Sequelize Hooks for Event Publishing
  
  // Hook: After Create - Publish task.created event
  Task.addHook('afterCreate', async (task, options) => {
    try {
      console.log('🔍 Task model data before publishing:', {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status
      });

      await rabbitmq.publishReminderEvent('task.created', {
        id: task.id,
        taskId: task.id,
        userId: task.userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        remindBefore: task.remindBefore || 30,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      });
      
      logger.info('Published task.created event', {
        taskId: task.id,
        userId: task.userId,
        title: task.title
      });
    } catch (error) {
      logger.error('Failed to publish task.created event:', {
        error: error.message,
        taskId: task.id,
        userId: task.userId
      });
      // Don't throw error to avoid interrupting the task creation
    }
  });

  // Hook: After Update - Publish task.updated or task.completed events
  Task.addHook('afterUpdate', async (task, options) => {
    try {
      const wasCompleted = task._previousDataValues?.status !== 'completed' && task.status === 'completed';
      
      if (wasCompleted) {
                 // Publish specific task.completed event when status changes to completed
         await rabbitmq.publishReminderEvent('task.completed', {
           id: task.id,
           taskId: task.id,
           userId: task.userId,
           title: task.title,
           description: task.description,
           priority: task.priority,
           dueDate: task.dueDate,
           remindBefore: task.remindBefore || 30,
           status: task.status,
           createdAt: task.createdAt,
           updatedAt: task.updatedAt,
           completedAt: task.completedAt || new Date()
         });
        
        logger.info('Published task.completed event', {
          taskId: task.id,
          userId: task.userId,
          title: task.title
        });
      } else {
                 // Publish general task.updated event for other changes
         await rabbitmq.publishReminderEvent('task.updated', {
           id: task.id,
           taskId: task.id,
           userId: task.userId,
           title: task.title,
           description: task.description,
           priority: task.priority,
           dueDate: task.dueDate,
           remindBefore: task.remindBefore || 30,
           status: task.status,
           createdAt: task.createdAt,
           updatedAt: task.updatedAt
         });
        
        logger.info('Published task.updated event', {
          taskId: task.id,
          userId: task.userId,
          title: task.title,
          wasCompleted
        });
      }
    } catch (error) {
      logger.error('Failed to publish task update event:', {
        error: error.message,
        taskId: task.id,
        userId: task.userId
      });
      // Don't throw error to avoid interrupting the task update
    }
  });

  // Hook: After Destroy - Publish task.deleted event
  Task.addHook('afterDestroy', async (task, options) => {
    try {
      await rabbitmq.publishReminderEvent('task.deleted', {
        id: task.id,
        taskId: task.id,
        userId: task.userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        remindBefore: task.remindBefore || 30,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      });
      
      logger.info('Published task.deleted event', {
        taskId: task.id,
        userId: task.userId,
        title: task.title
      });
    } catch (error) {
      logger.error('Failed to publish task.deleted event:', {
        error: error.message,
        taskId: task.id,
        userId: task.userId
      });
      // Don't throw error to avoid interrupting the task deletion
    }
  });

  return Task;
}; 