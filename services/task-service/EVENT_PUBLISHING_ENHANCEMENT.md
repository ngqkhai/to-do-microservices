# 🎯 Task Service - RabbitMQ Event Publishing Enhancement

## Overview
Enhanced the task service to automatically publish RabbitMQ events for all task lifecycle operations using Sequelize model hooks and topic routing.

## ✅ Implementation Summary

### 1. **New RabbitMQ Manager**
**File**: `src/messaging/rabbitmq.js`
- Created dedicated RabbitMQ manager class with topic routing
- Exchange: `task-events` (type: `topic`)
- Method: `publishReminderEvent(eventType, data)`
- Routing keys: `task.created`, `task.updated`, `task.completed`, `task.deleted`

### 2. **Enhanced Task Model**
**File**: `src/models/Task.js`
- Added `remindBefore` field (INTEGER, default: 30 minutes)
- Implemented Sequelize hooks for automatic event publishing:
  - `afterCreate` → `task.created`
  - `afterUpdate` → `task.updated` or `task.completed`
  - `afterDestroy` → `task.deleted`

### 3. **Event Format** 
```javascript
{
  type: 'task.created|updated|completed|deleted',
  data: {
    taskId: 'uuid',
    userId: 'uuid', 
    title: 'string',
    dueDate: 'timestamp',
    remindBefore: number, // minutes
    status: 'active' | 'completed',
    createdAt: 'timestamp',
    updatedAt: 'timestamp'
  },
  service: 'task-service',
  timestamp: 'ISO 8601 string'
}
```

### 4. **Database Migration**
**File**: `src/migrations/20240320000001-add-remind-before-to-tasks.js`
- Added `remindBefore` column to tasks table
- Added index for performance

### 5. **Updated Components**
- **Service Layer**: Added `remindBefore` handling in CRUD operations
- **Swagger Schema**: Updated API documentation with new field
- **Main App**: Initialize RabbitMQ Manager alongside legacy setup

## 🔄 Event Publishing Flow

### Task Creation
```javascript
// User creates task via API
POST /api/tasks
↓
taskService.createTask() 
↓
taskRepo.create() // Sequelize insert
↓
Task.afterCreate hook triggered
↓
rabbitmq.publishReminderEvent('task.created', taskData)
↓
Event published to 'task-events' exchange with routing key 'task.created'
```

### Task Update
```javascript
// User updates task via API
PUT /api/tasks/:id
↓
taskService.updateTask()
↓
taskRepo.update() // Sequelize update
↓
Task.afterUpdate hook triggered
↓
if (status changed to 'completed') {
  rabbitmq.publishReminderEvent('task.completed', taskData)
} else {
  rabbitmq.publishReminderEvent('task.updated', taskData)
}
```

### Task Deletion
```javascript
// User deletes task via API
DELETE /api/tasks/:id
↓
taskService.deleteTask()
↓
taskRepo.delete() // Sequelize destroy
↓
Task.afterDestroy hook triggered
↓
rabbitmq.publishReminderEvent('task.deleted', taskData)
```

## 🔐 Security Features
- Events only published for valid tasks (user ownership verified)
- Error handling prevents failed events from breaking operations
- All events include user context for authorization

## 🚀 Usage Examples

### Creating a Task with Reminder
```javascript
POST /api/tasks
{
  "title": "Complete project",
  "description": "Finish the documentation",
  "due_date": "2024-03-25T10:00:00Z",
  "remindBefore": 60, // 60 minutes before due date
  "priority": "high"
}
```

### Published Event
```javascript
{
  "type": "task.created",
  "data": {
    "taskId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "user-uuid",
    "title": "Complete project", 
    "dueDate": "2024-03-25T10:00:00Z",
    "remindBefore": 60,
    "status": "active",
    "createdAt": "2024-03-20T12:00:00Z",
    "updatedAt": "2024-03-20T12:00:00Z"
  },
  "service": "task-service",
  "timestamp": "2024-03-20T12:00:00.123Z"
}
```

## 🎯 Integration Points
- **Reminder Service**: Consumes events to create/update/delete reminders
- **Notification Service**: Can consume events for real-time notifications  
- **Analytics Service**: Can consume events for usage tracking
- **Audit Service**: Can consume events for activity logging

## ⚡ Performance Considerations
- Events published asynchronously (non-blocking)
- Failed event publishing doesn't break task operations
- Connection pooling and error recovery built-in
- Topic routing allows selective consumption

## 🔧 Configuration
Required environment variables:
```bash
RABBITMQ_URL=amqp://localhost:5672
```

## 📝 Testing
The events can be tested by:
1. Creating/updating/deleting tasks via API
2. Monitoring RabbitMQ management UI
3. Setting up test consumers for the `task-events` exchange
4. Checking application logs for event publishing confirmations

## 🎯 Next Steps
- Set up reminder service to consume these events
- Add event versioning for backward compatibility
- Implement dead letter queues for failed event processing
- Add metrics and monitoring for event publishing 