'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('reminders', 'task_title', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Task title for display in notifications'
    });

    await queryInterface.addColumn('reminders', 'task_description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Task description for display in notifications'
    });

    await queryInterface.addColumn('reminders', 'task_priority', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'medium',
      comment: 'Task priority for display in notifications'
    });

    await queryInterface.addColumn('reminders', 'task_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'pending',
      comment: 'Task status for display in notifications'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('reminders', 'task_title');
    await queryInterface.removeColumn('reminders', 'task_description');
    await queryInterface.removeColumn('reminders', 'task_priority');
    await queryInterface.removeColumn('reminders', 'task_status');
  }
}; 