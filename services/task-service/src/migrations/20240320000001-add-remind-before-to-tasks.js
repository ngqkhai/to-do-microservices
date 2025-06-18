'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tasks', 'remindBefore', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 30,
      comment: 'Minutes before due date to send reminder'
    });

    // Add index for reminder queries
    await queryInterface.addIndex('tasks', ['remindBefore'], {
      name: 'tasks_remind_before_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('tasks', 'tasks_remind_before_idx');
    await queryInterface.removeColumn('tasks', 'remindBefore');
  }
}; 