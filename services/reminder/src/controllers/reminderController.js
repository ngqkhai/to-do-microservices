const reminderService = require('../services/reminderService');
const { logger } = require('../config/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Get all reminders (admin endpoint)
const getAllReminders = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;

    const result = await reminderService.getAllReminders({
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get user's reminders
const getUserReminders = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { limit, offset, status } = req.query;

    const result = await reminderService.getUserReminders(userId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      status
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get reminder statistics
const getStats = async (req, res, next) => {
  try {
    const stats = await reminderService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Manually trigger reminder scan
const triggerScan = async (req, res, next) => {
  try {
    const result = await reminderService.scanAndTriggerReminders();
    res.json({
      message: 'Reminder scan completed',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Create a reminder manually (for testing)
const createReminder = async (req, res, next) => {
  try {
    const { taskId, dueDate, remindBefore } = req.body;
    const { id: userId } = req.user; // Use authenticated user's ID

    if (!taskId || !dueDate) {
      throw new ValidationError('Missing required fields: taskId or dueDate');
    }

    const reminder = await reminderService.createReminder({
      id: taskId,
      userId, // Use authenticated user's ID
      dueDate,
      remindBefore
    });

    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

// Update a reminder
const updateReminder = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { dueDate, remindBefore } = req.body;

    const reminder = await reminderService.updateReminder({
      id: taskId,
      dueDate,
      remindBefore
    });

    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

// Delete a reminder
const deleteReminder = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    await reminderService.deleteReminder(taskId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Get pending reminders for user
const getPendingReminders = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { limit, offset } = req.query;

    const result = await reminderService.getUserReminders(userId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      status: 'pending'
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Get sent reminders for user
const getSentReminders = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { limit, offset } = req.query;

    const result = await reminderService.getUserReminders(userId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      status: 'sent'
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReminders,
  getUserReminders,
  getStats,
  triggerScan,
  createReminder,
  updateReminder,
  deleteReminder,
  getPendingReminders,
  getSentReminders
}; 