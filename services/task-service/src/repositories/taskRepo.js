const { Task } = require('../models');
const { Op } = require('sequelize');

class TaskRepository {
  async create(taskData) {
    return Task.create({
      userId: taskData.userId,
      title: taskData.title,
      description: taskData.description,
      dueDate: taskData.dueDate,
      priority: taskData.priority || 'medium',
      status: taskData.status || 'pending',
      remindBefore: taskData.remindBefore
    });
  }

  async findById(id, userId) {
    return Task.findOne({
      where: {
        id,
        userId: userId
      }
    });
  }

  async update(id, userId, updateData) {
    const [updatedRowsCount] = await Task.update(updateData, {
      where: {
        id,
        userId: userId
      }
    });
    
    if (updatedRowsCount === 0) {
      return null;
    }
    
    return this.findById(id, userId);
  }

  async delete(id, userId) {
    return Task.destroy({
      where: {
        id,
        userId: userId
      }
    });
  }

  async findAllByUser(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      order = [['createdAt', 'DESC']],
      where = {}
    } = options;

    return Task.findAndCountAll({
      where: {
        userId: userId,
        ...where
      },
      limit,
      offset,
      order
    });
  }

  async findByStatus(userId, status, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return Task.findAndCountAll({
      where: {
        userId: userId,
        status
      },
      limit,
      offset,
      order: [['dueDate', 'ASC']]
    });
  }

  async findByPriority(userId, priority, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return Task.findAndCountAll({
      where: {
        userId: userId,
        priority
      },
      limit,
      offset,
      order: [['dueDate', 'ASC']]
    });
  }

  async findOverdue(userId, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return Task.findAndCountAll({
      where: {
        userId: userId,
        dueDate: {
          [Op.lt]: new Date()
        },
        status: {
          [Op.ne]: 'completed'
        }
      },
      limit,
      offset,
      order: [['dueDate', 'ASC']]
    });
  }

  async findDueToday(userId, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Task.findAndCountAll({
      where: {
        userId: userId,
        dueDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: {
          [Op.ne]: 'completed'
        }
      },
      limit,
      offset,
      order: [['priority', 'DESC'], ['dueDate', 'ASC']]
    });
  }

  async searchByTitle(userId, searchTerm, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return Task.findAndCountAll({
      where: {
        userId: userId,
        title: {
          [Op.iLike]: `%${searchTerm}%`
        }
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = new TaskRepository(); 