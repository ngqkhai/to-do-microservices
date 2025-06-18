const taskRepo = require('../repositories/taskRepo');
const { logger } = require('../config/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');

class TaskService {
  async getAllTasks(userId, filters = {}) {
    const { status, priority, search, limit, offset } = filters;

    let result;
    if (status) {
      result = await taskRepo.findByStatus(userId, status, { limit, offset });
    } else if (priority) {
      result = await taskRepo.findByPriority(userId, priority, { limit, offset });
    } else if (search) {
      result = await taskRepo.searchByTitle(userId, search, { limit, offset });
    } else {
      result = await taskRepo.findAllByUser(userId, { limit, offset });
    }

    return {
      tasks: result.rows,
      total: result.count,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    };
  }

  async getOverdueTasks(userId, options = {}) {
    const result = await taskRepo.findOverdue(userId, options);
    return {
      tasks: result.rows,
      total: result.count,
      limit: parseInt(options.limit) || 50,
      offset: parseInt(options.offset) || 0
    };
  }

  async getTasksDueToday(userId, options = {}) {
    const result = await taskRepo.findDueToday(userId, options);
    return {
      tasks: result.rows,
      total: result.count,
      limit: parseInt(options.limit) || 50,
      offset: parseInt(options.offset) || 0
    };
  }

  async createTask(userId, taskData) {
    // Validate required fields
    if (!taskData.title) {
      throw new ValidationError('Title is required');
    }

    // Create task (event publishing handled by Sequelize hooks)
    const task = await taskRepo.create({
      userId: userId,
      title: taskData.title,
      description: taskData.description,
      dueDate: taskData.dueDate,
      priority: taskData.priority,
      status: taskData.status,
      remindBefore: taskData.remindBefore
    });

    logger.info('Task created', {
      taskId: task.id,
      userId: task.userId,
      title: task.title
    });

    return task;
  }

  async updateTask(userId, taskId, updateData) {
    // Check if task exists and belongs to user
    const task = await taskRepo.findById(taskId, userId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Update task (event publishing handled by Sequelize hooks)
    const updatedTask = await taskRepo.update(taskId, userId, {
      title: updateData.title,
      description: updateData.description,
      dueDate: updateData.dueDate,
      priority: updateData.priority,
      status: updateData.status,
      remindBefore: updateData.remindBefore
    });

    logger.info('Task updated', {
      taskId: updatedTask.id,
      userId: updatedTask.userId,
      title: updatedTask.title
    });

    return updatedTask;
  }

  async deleteTask(userId, taskId) {
    // Check if task exists and belongs to user
    const task = await taskRepo.findById(taskId, userId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Delete task (event publishing handled by Sequelize hooks)
    await taskRepo.delete(taskId, userId);

    logger.info('Task deleted', {
      taskId,
      userId
    });
  }



  // Additional business logic methods
  async markTaskAsCompleted(userId, taskId) {
    return this.updateTask(userId, taskId, { status: 'completed' });
  }

  async markTaskAsInProgress(userId, taskId) {
    return this.updateTask(userId, taskId, { status: 'in_progress' });
  }

  async updateTaskPriority(userId, taskId, priority) {
    if (!['low', 'medium', 'high'].includes(priority)) {
      throw new ValidationError('Invalid priority value');
    }
    return this.updateTask(userId, taskId, { priority });
  }

  async updateTaskDueDate(userId, taskId, dueDate) {
    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      throw new ValidationError('Invalid due date');
    }
    return this.updateTask(userId, taskId, { dueDate: dueDate });
  }
}

module.exports = new TaskService(); 