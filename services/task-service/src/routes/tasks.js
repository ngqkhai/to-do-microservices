const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/taskController');



/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *         description: Filter tasks by status
 *         example: pending
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter tasks by priority
 *         example: high
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search tasks by title
 *         example: documentation
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of tasks to return
 *         example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *         example: 0
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getAllTasks);

/**
 * @swagger
 * /api/tasks/overdue:
 *   get:
 *     summary: Get overdue tasks for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *     responses:
 *       200:
 *         description: List of overdue tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/overdue', getOverdueTasks);

/**
 * @swagger
 * /api/tasks/due-today:
 *   get:
 *     summary: Get tasks due today for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *     responses:
 *       200:
 *         description: List of tasks due today
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/due-today', getTasksDueToday);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *                 example: Complete project documentation
 *               description:
 *                 type: string
 *                 description: Task description
 *                 example: Write comprehensive documentation for the new feature
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: Task due date
 *                 example: 2024-03-20T15:30:00.000Z
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: Task priority
 *                 example: high
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *                 description: Task status
 *                 example: pending
 *           examples:
 *             example1:
 *               summary: Basic task
 *               value:
 *                 title: Complete project documentation
 *                 description: Write comprehensive documentation for the new feature
 *                 due_date: 2024-03-20T15:30:00.000Z
 *                 priority: high
 *                 status: pending
 *             example2:
 *               summary: Simple task
 *               value:
 *                 title: Review code changes
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update an existing task
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *                 example: Updated task title
 *               description:
 *                 type: string
 *                 description: Task description
 *                 example: Updated task description
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: Task due date
 *                 example: 2024-03-21T16:00:00.000Z
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: Task priority
 *                 example: medium
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *                 description: Task status
 *                 example: in_progress
 *           examples:
 *             example1:
 *               summary: Update task details
 *               value:
 *                 title: Updated task title
 *                 description: Updated task description
 *                 due_date: 2024-03-21T16:00:00.000Z
 *                 priority: medium
 *                 status: in_progress
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       204:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/complete:
 *   post:
 *     summary: Mark a task as completed
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Task marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/complete', markTaskAsCompleted);

/**
 * @swagger
 * /api/tasks/{id}/progress:
 *   post:
 *     summary: Mark a task as in progress
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Task marked as in progress
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/progress', markTaskAsInProgress);

/**
 * @swagger
 * /api/tasks/{id}/priority:
 *   patch:
 *     summary: Update task priority
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priority
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: New task priority
 *                 example: high
 *           examples:
 *             example1:
 *               summary: Set high priority
 *               value:
 *                 priority: high
 *             example2:
 *               summary: Set medium priority
 *               value:
 *                 priority: medium
 *     responses:
 *       200:
 *         description: Task priority updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid priority value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/priority', updateTaskPriority);

/**
 * @swagger
 * /api/tasks/{id}/due-date:
 *   patch:
 *     summary: Update task due date
 *     tags: [Tasks]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dueDate
 *             properties:
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: New task due date
 *                 example: 2024-03-25T14:00:00.000Z
 *           examples:
 *             example1:
 *               summary: Set due date
 *               value:
 *                 dueDate: 2024-03-25T14:00:00.000Z
 *             example2:
 *               summary: Set due date for next week
 *               value:
 *                 dueDate: 2024-03-27T09:00:00.000Z
 *     responses:
 *       200:
 *         description: Task due date updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid due date
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/due-date', updateTaskDueDate);

module.exports = router; 