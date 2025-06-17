# Service Registry Documentation

## Overview
Node.js Express-based Service Registry for microservice discovery and health monitoring.

## Features
- Service registration with name, IP, port
- Heartbeat monitoring for health tracking
- Service discovery for healthy instances
- Automatic cleanup of dead services
- In-memory Map storage
- REST API endpoints

## Installation
```bash
cd service-registry
npm install
npm start
```

## API Endpoints

### POST /register
Register a service instance.
```json
{
  "name": "user-service",
  "ip": "127.0.0.1", 
  "port": 3001
}
```

### POST /heartbeat
Update service heartbeat.
```json
{
  "name": "user-service",
  "ip": "127.0.0.1",
  "port": 3001
}
```

### GET /resolve/:name
Get healthy instances for a service.

### GET /services
List all services and instances.

### GET /stats
Registry statistics and metrics.

## Configuration
- PORT=3100
- HEARTBEAT_TIMEOUT_SECONDS=10
- CLEANUP_INTERVAL_SECONDS=5
- MAX_INSTANCES_PER_SERVICE=10 