# 📧 Notification Service

A microservice that handles email notifications for the To-Do application using Gmail SMTP. Consumes `REMINDER_TRIGGERED` events from RabbitMQ and sends beautiful HTML email reminders to users.

## 🚀 Features

- ✅ **Gmail SMTP Integration** - Send emails via Gmail's SMTP server
- ✅ **RabbitMQ Event Consumption** - Listen for `REMINDER_TRIGGERED` events
- ✅ **Beautiful HTML Templates** - Responsive email templates with modern design
- ✅ **Robust Error Handling** - Comprehensive logging and error recovery
- ✅ **Health Monitoring** - Health check endpoints for service monitoring
- ✅ **Graceful Shutdown** - Clean shutdown with connection cleanup

## 📋 Prerequisites

Before running the notification service, ensure you have:

1. **Node.js** (v16 or higher)
2. **RabbitMQ** server running
3. **Gmail account** with App Password enabled
4. **Reminder service** running (to publish events)

## 🔧 Gmail Setup

### Step 1: Enable 2-Factor Authentication
1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-factor authentication

### Step 2: Generate App Password
1. Go to **Security** → **App passwords**
2. Select app: **Mail**
3. Select device: **Other (custom name)**
4. Enter name: **To-Do Notification Service**
5. Copy the generated 16-character password

### Step 3: Update Environment Variables
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
```

## ⚙️ Installation

1. **Install dependencies:**
```bash
cd services/notification
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your Gmail credentials
```

3. **Required Environment Variables:**
```bash
# Gmail SMTP Configuration
EMAIL_USER=your-email@gmail.com           # Your Gmail address
EMAIL_PASSWORD=your-app-password           # 16-character app password
EMAIL_FROM=noreply@todo-app.com           # From address

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=reminder-events
RABBITMQ_QUEUE=notification-service-queue

# Service Configuration
PORT=3005
NODE_ENV=development
```

## 🏃‍♂️ Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Health Check
```bash
curl http://localhost:3005/health
```

## 📨 Event Processing

The service listens for `REMINDER_TRIGGERED` events with this structure:

```json
{
  "type": "REMINDER_TRIGGERED",
  "data": {
    "reminderId": "uuid",
    "taskId": "uuid", 
    "userId": "uuid",
    "dueDate": "2025-06-18T05:30:00.000Z",
    "message": "Your task is due at..."
  },
  "service": "reminder-service",
  "timestamp": "2025-06-17T22:35:23.878Z"
}
```

## 📧 Email Template

The service uses a beautiful, responsive HTML email template that includes:

- 🎨 **Modern Design** - Gradient headers and clean layout
- 📱 **Mobile Responsive** - Optimized for all screen sizes
- ⏰ **Due Date Highlighting** - Clear due date display
- 🔗 **Action Buttons** - Call-to-action buttons (future enhancement)
- 📊 **Metadata** - Task ID and User ID for tracking

## 🔍 Monitoring

### Health Endpoint
```bash
GET /health
```

Response:
```json
{
  "service": "notification-service",
  "status": "healthy",
  "initialized": true,
  "timestamp": "2025-06-18T05:35:23.878Z",
  "components": {
    "emailService": {
      "connected": true,
      "service": "gmail",
      "user": "your-email@gmail.com"
    },
    "reminderHandler": {
      "status": "healthy",
      "supportedEvents": ["REMINDER_TRIGGERED"]
    }
  },
  "rabbitmq": {
    "isConnected": true,
    "exchange": "reminder-events",
    "queue": "notification-service-queue"
  }
}
```

### Logs
Logs are written to:
- **Console** (development)
- **File**: `logs/notification.log`
- **Error File**: `logs/error.log`

## 🧪 Testing

### Test Email Functionality
The service includes built-in email testing capabilities. You can test by:

1. **Creating a test task** with a due date in the next few minutes
2. **Waiting for the reminder** to trigger
3. **Checking your email** for the notification

### Manual Testing
```bash
# Create a task that will trigger a reminder soon
curl -X POST http://localhost:8080/task-service/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: cf5a9e14-08d3-43d3-95f1-48d7bf658b2a" \
  -d '{
    "title": "Test email notification",
    "due_date": "2025-06-18T06:00:00.000Z",
    "remindBefore": 1
  }'
```

## 🔧 Configuration

### Gmail Rate Limits
- **Rate Limit**: 14 emails per second
- **Daily Limit**: 500 emails per day (free Gmail)
- **Connection Pooling**: Enabled for better performance

### RabbitMQ Settings
- **Prefetch**: 1 message at a time
- **Durability**: Queues and exchanges are durable
- **Acknowledgment**: Manual acknowledgment after processing

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Error**
   ```
   Error: Invalid login: 535-5.7.8 Username and Password not accepted
   ```
   **Solution**: Ensure you're using an App Password, not your regular Gmail password.

2. **Connection Timeout**
   ```
   Error: Connection timeout
   ```
   **Solution**: Check your firewall settings and Gmail SMTP access.

3. **RabbitMQ Connection Failed**
   ```
   Error: Failed to connect to RabbitMQ
   ```
   **Solution**: Ensure RabbitMQ server is running on `localhost:5672`.

4. **No Emails Received**
   - Check spam/junk folder
   - Verify Gmail credentials
   - Check service logs for errors
   - Ensure reminder service is publishing events

### Debug Mode
Set `LOG_LEVEL=debug` in `.env` for detailed logging.

## 🔄 Integration

### With Reminder Service
1. Ensure reminder service is running
2. Verify RabbitMQ exchange `reminder-events` exists
3. Check that `REMINDER_TRIGGERED` events are being published

### With User Service (Future)
The service currently uses placeholder emails. To integrate with user service:

1. Update `emailService.getUserEmail()` method
2. Add API call to user service
3. Handle user not found scenarios

## 📈 Future Enhancements

- 📱 **SMS Notifications** (Twilio integration)
- 🔔 **Push Notifications** (Web Push API)
- 📊 **Database Logging** (Notification history)
- 👤 **User Preferences** (Notification settings)
- 🔄 **Retry Logic** (Failed email retry)
- 📈 **Analytics** (Email open/click tracking)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Reminder Service│───▶│    RabbitMQ      │───▶│ Notification    │
│                 │    │ (reminder-events)│    │ Service         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Gmail SMTP      │
                                               │ (Email Delivery)│
                                               └─────────────────┘
```

## 📄 License

MIT License - see LICENSE file for details. 