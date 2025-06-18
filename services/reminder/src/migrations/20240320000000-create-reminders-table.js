'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reminders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'Task ID from the task service, no foreign key constraint'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'User ID from the user service, no foreign key constraint'
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Original due date from the task'
      },
      remind_before: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'Minutes before due date to send reminder'
      },
      reminder_time: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Calculated time when reminder should be sent'
      },
      sent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the reminder has been sent'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('reminders', ['task_id'], {
      name: 'reminders_task_id_idx'
    });
    await queryInterface.addIndex('reminders', ['user_id'], {
      name: 'reminders_user_id_idx'
    });
    await queryInterface.addIndex('reminders', ['reminder_time'], {
      name: 'reminders_reminder_time_idx'
    });
    await queryInterface.addIndex('reminders', ['sent'], {
      name: 'reminders_sent_idx'
    });
    await queryInterface.addIndex('reminders', ['reminder_time', 'sent'], {
      name: 'reminders_due_scanner_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reminders');
  }
}; 