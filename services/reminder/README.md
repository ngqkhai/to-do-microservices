# Reminder Service

A standalone Node.js microservice that handles task reminders using RabbitMQ events and PostgreSQL storage.

## 🎯 Features

- **Event-Driven**: Subscribes to task events from RabbitMQ and manages reminders accordingly
- **Automated Scanning**: Periodically scans for due reminders and triggers notifications
- **PostgreSQL Storage**: Persistent reminder storage with optimized queries
- **REST API**: Provides endpoints for health checks, statistics, and reminder management
- **Graceful Shutdown**: Proper cleanup of connections and resources

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Task Service  │───▶│   RabbitMQ      │───▶│ Reminder Service│
│                 │    │ (task-events)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   PostgreSQL    │
                                               │  (reminders)    │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   RabbitMQ      │
                                               │(reminder-events)│
                                               └─────────────────┘
```

## 📋 Database Schema

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  due_date TIMESTAMP NOT NULL,
  remind_before INTEGER NOT NULL, -- minutes before due date
  reminder_time TIMESTAMP NOT NULL, -- calculated: due_date - remind_before
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_reminders_task_id ON reminders(task_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_scanner ON reminders(reminder_time, sent);
CREATE INDEX idx_reminders_sent ON reminders(sent);
```

## 🔄 Event Processing

### Incoming Events (task-events exchange)

| Event | Action | Description |
|-------|--------|-------------|
| `task.created` | Create reminder | Creates new reminder if task has due date |
| `task.updated` | Update/Create/Delete | Updates reminder, creates if missing, deletes if no due date |
| `task.completed` | Delete reminder | Removes reminder since task is done |
| `task.deleted` | Delete reminder | Removes reminder since task no longer exists |

### Outgoing Events (reminder-events exchange)

| Event | Routing Key | Description |
|-------|-------------|-------------|
| `REMINDER_TRIGGERED` | `reminder.reminder_triggered` | Published when reminder is due |

### Event Payload Example

**Incoming (task.created):**
```json
{
  "type": "TASK_CREATED",
  "data": {
    "id": "task-uuid",
    "userId": "user-uuid", 
    "title": "Complete project",
    "dueDate": "2025-06-18T10:00:00Z",
    "remindBefore": 30
  },
  "timestamp": "2025-06-17T18:30:00Z"
}
```

**Outgoing (reminder.reminder_triggered):**
```json
{
  "type": "REMINDER_TRIGGERED",
  "data": {
    "reminderId": "reminder-uuid",
    "taskId": "task-uuid",
    "userId": "user-uuid",
    "dueDate": "2025-06-18T10:00:00Z",
    "message": "Task reminder: Your task is due at 6/18/2025, 10:00:00 AM"
  },
  "timestamp": "2025-06-18T09:30:00Z",
  "service": "reminder-service"
}
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- RabbitMQ 3.8+

### Installation

1. **Install dependencies:**
   ```bash
   cd services/reminder
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database and RabbitMQ settings
   ```

3. **Start PostgreSQL and RabbitMQ:**
   ```bash
   # PostgreSQL (create database)
   createdb reminderdb
   
   # RabbitMQ (default installation)
   rabbitmq-server
   ```

4. **Start the service:**
   ```bash
   npm start
   ```

### Development

```bash
npm run dev  # Uses nodemon for auto-restart
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3004 | HTTP server port |
| `NODE_ENV` | development | Environment mode |
| `DB_URL` | postgres://postgres:password@localhost:5432/reminderdb | PostgreSQL connection string |
| `RABBITMQ_URL` | amqp://localhost | RabbitMQ connection string |
| `TASK_EVENTS_EXCHANGE` | task-events | Exchange to subscribe for task events |
| `REMINDER_EVENTS_EXCHANGE` | reminder-events | Exchange to publish reminder events |
| `SCAN_INTERVAL_MS` | 60000 | Reminder scanner interval (1 minute) |

## 📡 API Endpoints

### Health & Status

- **GET /health** - Service health check
- **GET /stats** - Service statistics
- **GET /** - Service information

### Reminders

- **GET /reminders** - Get all active reminders
- **GET /reminders/user/:userId** - Get reminders for specific user
- **POST /scan** - Manually trigger reminder scan (testing)

### Example Responses

**GET /health:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-17T18:30:00.000Z",
  "service": "reminder-service",
  "version": "1.0.0",
  "uptime": 3600,
  "database": {
    "connected": true,
    "reminders": {
      "total": 25,
      "pending": 15,
      "sent": 10,
      "overdue": 2
    }
  },
  "rabbitmq": {
    "connected": true,
    "hasPublishChannel": true,
    "hasConsumeChannel": true
  }
}
```

**GET /reminders:**
```json
{
  "reminders": [
    {
      "id": "reminder-uuid",
      "task_id": "task-uuid",
      "user_id": "user-uuid",
      "due_date": "2025-06-18T10:00:00.000Z",
      "remind_before": 30,
      "reminder_time": "2025-06-18T09:30:00.000Z",
      "sent": false,
      "created_at": "2025-06-17T18:30:00.000Z",
      "updated_at": "2025-06-17T18:30:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2025-06-17T18:30:00.000Z"
}
```

## ⏰ Reminder Logic

1. **Calculation**: `reminder_time = due_date - remind_before (minutes)`
2. **Scanner**: Runs every `SCAN_INTERVAL_MS` (default: 1 minute)
3. **Query**: `SELECT * FROM reminders WHERE reminder_time <= NOW() AND sent = FALSE`
4. **Trigger**: Publish event to `reminder-events` exchange
5. **Mark Sent**: Update `sent = TRUE` to prevent duplicates

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Manual Testing

1. **Start services:**
   ```bash
   # Terminal 1: Start reminder service
   npm start
   
   # Terminal 2: Create a task with due date via task service
   curl -X POST http://localhost:3002/api/tasks \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Task","dueDate":"2025-06-17T19:00:00Z","remindBefore":5}'
   ```

2. **Check reminder created:**
   ```bash
   curl http://localhost:3004/reminders
   ```

3. **Trigger manual scan:**
   ```bash
   curl -X POST http://localhost:3004/scan
   ```

## 🔍 Monitoring

- **Health Check**: `GET /health` - Database and RabbitMQ status
- **Statistics**: `GET /stats` - Reminder counts and system info
- **Logs**: Console output with timestamps and emojis for easy reading

## 🚨 Error Handling

- **Database Errors**: Logged and service continues (graceful degradation)
- **RabbitMQ Errors**: Events are rejected and requeued for retry
- **Scanner Errors**: Logged but scanner continues running
- **Graceful Shutdown**: Proper cleanup of connections and intervals

## 🔗 Integration

### With Task Service

The task service should publish events to the `task-events` exchange:

```javascript
// In task service
await publisher.publish('task-events', 'task.created', {
  type: 'TASK_CREATED',
  data: {
    id: task.id,
    userId: task.userId,
    title: task.title,
    dueDate: task.dueDate,
    remindBefore: task.remindBefore || 30
  }
});
```

### With Notification Service

The notification service should subscribe to `reminder-events` exchange:

```javascript
// In notification service
await subscriber.subscribe('reminder-events', 'reminder.*', (message) => {
  if (message.type === 'REMINDER_TRIGGERED') {
    sendNotification(message.data);
  }
});
```

## 🚀 Deployment

1. **Environment Setup**: Configure production environment variables
2. **Database Migration**: Run database initialization
3. **Service Start**: Use process manager (PM2, systemd, etc.)
4. **Monitoring**: Set up health check monitoring
5. **Scaling**: Can run multiple instances (scanner coordination needed)

## 📝 License

MIT License - see LICENSE file for details. 