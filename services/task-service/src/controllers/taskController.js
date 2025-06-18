const taskService = require('../services/taskService');
const { publishEvent } = require('../config/rabbitmq');
const { logger } = require('../config/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Get all tasks for a user
const getAllTasks = async (req, res, next) => {
  try {

    
    const { id: userId } = req.user;
    const { status, priority, search, limit, offset } = req.query;

    const result = await taskService.getAllTasks(userId, {
      status,
      priority,
      search,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get overdue tasks
const getOverdueTasks = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { limit, offset } = req.query;

    const result = await taskService.getOverdueTasks(userId, { limit, offset });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get tasks due today
const getTasksDueToday = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { limit, offset } = req.query;

    const result = await taskService.getTasksDueToday(userId, { limit, offset });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Create a new task
const createTask = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const task = await taskService.createTask(userId, req.body);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

// Update a task
const updateTask = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const taskId = req.params.id;
    const task = await taskService.updateTask(userId, taskId, req.body);
    res.json(task);
  } catch (error) {
    next(error);
  }
};

// Delete a task
const deleteTask = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const taskId = req.params.id;
    await taskService.deleteTask(userId, taskId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Mark task as completed
const markTaskAsCompleted = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const taskId = req.params.id;
    const task = await taskService.markTaskAsCompleted(userId, taskId);
    res.json(task);
  } catch (error) {
    next(error);
  }
};

// Mark task as in progress
const markTaskAsInProgress = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const taskId = req.params.id;
    const task = await taskService.markTaskAsInProgress(userId, taskId);
    res.json(task);
  } catch (error) {
    next(error);
  }
};

// Update task priority
const updateTaskPriority = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const taskId = req.params.id;
    const { priority } = req.body;
    const task = await taskService.updateTaskPriority(userId, taskId, priority);
    res.json(task);
  } catch (error) {
    next(error);
  }
};

// Update task due date
const updateTaskDueDate = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const taskId = req.params.id;
    const { dueDate } = req.body;
    const task = await taskService.updateTaskDueDate(userId, taskId, dueDate);
    res.json(task);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTasks,
  getOverdueTasks,
  getTasksDueToday,
  createTask,
  updateTask,
  deleteTask,
  markTaskAsCompleted,
  markTaskAsInProgress,
  updateTaskPriority,
  updateTaskDueDate
}; 