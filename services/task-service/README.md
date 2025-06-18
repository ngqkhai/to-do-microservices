# Task Service

A microservice for managing to-do tasks in a distributed system. This service handles CRUD operations for tasks and integrates with RabbitMQ for event publishing.

## Features

- RESTful API for task management
- PostgreSQL database integration
- RabbitMQ event publishing
- Service registry integration
- Health check endpoint
- Request logging
- User authentication via headers

## Prerequisites

- Node.js 14+
- PostgreSQL
- RabbitMQ
- Service Registry running on port 3100

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values according to your environment

3. Start the service:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### Tasks

- `GET /api/tasks` - Get all tasks for the authenticated user
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

### Health

- `GET /health` - Check service health status

## Authentication

The service expects the following headers from the API Gateway:
- `x-user-id` (required)
- `x-user-email`
- `x-user-roles`

## Events

The service publishes the following events to RabbitMQ:
- `task.created` - When a new task is created

## Database Schema

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  remind_before INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
``` 