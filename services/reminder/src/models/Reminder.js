const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reminder = sequelize.define('Reminder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'task_id',
      comment: 'Task ID from the task service, no foreign key constraint'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: 'User ID from the user service, no foreign key constraint'
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'due_date'
    },
    remindBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      field: 'remind_before',
      comment: 'Minutes before due date to send reminder'
    },
    reminderTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'reminder_time',
      comment: 'Calculated time when reminder should be sent'
    },
    sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the reminder has been sent'
    },
    taskTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'task_title',
      comment: 'Task title for display in notifications'
    },
    taskDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'task_description',
      comment: 'Task description for display in notifications'
    },
    taskPriority: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'medium',
      field: 'task_priority',
      comment: 'Task priority for display in notifications',
      validate: {
        isIn: [['low', 'medium', 'high']]
      }
    },
    taskStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'pending',
      field: 'task_status',
      comment: 'Task status for display in notifications',
      validate: {
        isIn: [['pending', 'in_progress', 'completed']]
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'reminders',
    timestamps: true,
    underscored: true, // Use snake_case for database columns
    indexes: [
      {
        name: 'reminders_task_id_idx',
        fields: ['task_id']
      },
      {
        name: 'reminders_user_id_idx',
        fields: ['user_id']
      },
      {
        name: 'reminders_reminder_time_idx',
        fields: ['reminder_time']
      },
      {
        name: 'reminders_sent_idx',
        fields: ['sent']
      },
      {
        name: 'reminders_due_scanner_idx',
        fields: ['reminder_time', 'sent']
      }
    ]
  });

  // No associations needed as we're following microservices principles
  Reminder.associate = () => {};

  return Reminder;
}; 