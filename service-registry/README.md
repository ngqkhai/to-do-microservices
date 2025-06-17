# Service Registry

A Node.js Express-based Service Registry for microservice discovery and health monitoring. This registry maintains an in-memory database of service instances and automatically removes unhealthy services based on heartbeat timeouts.

## Features

- **Service Registration**: Register service instances with name, IP, and port
- **Heartbeat Monitoring**: Track service health with periodic heartbeats
- **Service Discovery**: Resolve healthy service instances by name
- **Automatic Cleanup**: Remove dead services based on heartbeat timeout
- **Health Monitoring**: Built-in health checks and statistics
- **In-Memory Storage**: Fast Map-based storage with configurable limits
- **Comprehensive Logging**: Detailed logging of all operations
- **REST API**: Complete REST interface for service management

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Microservice  │───▶│  Service Registry│◀───│   API Gateway   │
│   (Register)    │    │   (Port 3100)    │    │ (Resolve Names) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Heartbeat     │    │   Cleanup Task   │    │   DNS Server    │
│   (Every 5s)    │    │   (Every 5s)     │    │  (Query Names)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Installation

1. **Install dependencies**
   ```bash
   cd service-registry
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   PORT=3100
   HEARTBEAT_TIMEOUT_SECONDS=10
   CLEANUP_INTERVAL_SECONDS=5
   MAX_INSTANCES_PER_SERVICE=10
   ```

3. **Start the registry**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Usage

### Service Registration Flow

1. **Service starts** and registers itself
2. **Service sends heartbeats** periodically  
3. **Registry tracks** service health
4. **Other services resolve** healthy instances
5. **Registry cleans up** dead services automatically

## API Endpoints

### POST /register
Register a new service instance.

**Request Body:**
```json
{
  "name": "user-service",
  "ip": "127.0.0.1",
  "port": 3001,
  "metadata": {
    "version": "1.0.0",
    "environment": "development"
  }
}
```

**Response (201):**
```json
{
  "message": "Service registered successfully",
  "instance": {
    "id": "uuid-here",
    "name": "user-service",
    "ip": "127.0.0.1",
    "port": 3001,
    "status": "healthy",
    "registeredAt": "2023-12-01T10:00:00Z"
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

### POST /heartbeat
Update service heartbeat to maintain health status.

**Request Body:**
```json
{
  "name": "user-service",
  "ip": "127.0.0.1",
  "port": 3001
}
```

**Response (200):**
```json
{
  "message": "Heartbeat updated",
  "instance": {
    "id": "uuid-here",
    "name": "user-service",
    "ip": "127.0.0.1",
    "port": 3001,
    "status": "healthy",
    "lastHeartbeat": "2023-12-01T10:05:00Z"
  },
  "timestamp": "2023-12-01T10:05:00Z"
}
```

### GET /resolve/:name
Get healthy instances for a service.

**Response (200):**
```json
{
  "serviceName": "user-service",
  "instanceCount": 2,
  "instances": [
    {
      "id": "uuid-1",
      "ip": "127.0.0.1",
      "port": 3001,
      "status": "healthy",
      "lastHeartbeat": "2023-12-01T10:05:00Z",
      "registeredAt": "2023-12-01T10:00:00Z",
      "metadata": {}
    },
    {
      "id": "uuid-2",
      "ip": "127.0.0.1",
      "port": 3002,
      "status": "healthy",
      "lastHeartbeat": "2023-12-01T10:04:30Z",
      "registeredAt": "2023-12-01T10:00:30Z",
      "metadata": {}
    }
  ],
  "timestamp": "2023-12-01T10:05:15Z"
}
```

### GET /services
List all registered services and their instances.

**Response (200):**
```json
{
  "totalServices": 3,
  "totalInstances": 5,
  "totalHealthyInstances": 4,
  "services": {
    "user-service": {
      "instanceCount": 2,
      "healthyCount": 2,
      "instances": [...]
    },
    "task-service": {
      "instanceCount": 2,
      "healthyCount": 1,
      "instances": [...]
    }
  },
  "timestamp": "2023-12-01T10:05:15Z"
}
```

### GET /stats
Get registry statistics and performance metrics.

**Response (200):**
```json
{
  "totalRegistrations": 150,
  "totalHeartbeats": 2500,
  "totalCleanups": 12,
  "activeServices": 3,
  "activeInstances": 5,
  "services": ["user-service", "task-service", "notification-service"],
  "uptime": 3600,
  "heartbeatTimeout": "10s",
  "cleanupInterval": "5s",
  "timestamp": "2023-12-01T10:05:15Z"
}
```

### GET /health
Service health check.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:05:15Z",
  "service": "service-registry",
  "version": "1.0.0",
  "uptime": 3600
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Registry server port |
| `NODE_ENV` | `development` | Environment |
| `HEARTBEAT_TIMEOUT_SECONDS` | `10` | Time before service is considered dead |
| `CLEANUP_INTERVAL_SECONDS` | `5` | How often to run cleanup |
| `MAX_INSTANCES_PER_SERVICE` | `10` | Maximum instances per service |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:8080` | CORS origins |

### Service Health Management

- **Heartbeat Timeout**: Services must send heartbeats within the timeout window
- **Cleanup Process**: Runs every 5 seconds to remove dead services
- **Instance Limits**: Prevents registry bloat with configurable instance limits
- **Health Status**: Tracks healthy/unhealthy states automatically

## Data Structure

### Service Instance
```json
{
  "id": "uuid",
  "name": "service-name",
  "ip": "127.0.0.1",
  "port": 3001,
  "status": "healthy",
  "registeredAt": 1701425000000,
  "lastHeartbeat": 1701425300000,
  "metadata": {}
}
```

### Storage Format
```javascript
Map<serviceName, Array<serviceInstance>>
```

## Integration Examples

### Service Registration (Node.js)
```javascript
const axios = require('axios');

class ServiceClient {
  constructor(serviceName, servicePort, registryUrl = 'http://localhost:3100') {
    this.serviceName = serviceName;
    this.servicePort = servicePort;
    this.serviceIp = '127.0.0.1';
    this.registryUrl = registryUrl;
    this.heartbeatInterval = null;
  }

  async register() {
    try {
      await axios.post(`${this.registryUrl}/register`, {
        name: this.serviceName,
        ip: this.serviceIp,
        port: this.servicePort,
        metadata: {
          version: '1.0.0',
          startTime: new Date().toISOString()
        }
      });
      
      console.log(`Service ${this.serviceName} registered successfully`);
      this.startHeartbeat();
    } catch (error) {
      console.error('Registration failed:', error.message);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await axios.post(`${this.registryUrl}/heartbeat`, {
          name: this.serviceName,
          ip: this.serviceIp,
          port: this.servicePort
        });
        
        console.log('Heartbeat sent');
      } catch (error) {
        console.error('Heartbeat failed:', error.message);
      }
    }, 5000); // 5 seconds
  }

  async deregister() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    try {
      await axios.delete(
        `${this.registryUrl}/services/${this.serviceName}/instances?ip=${this.serviceIp}&port=${this.servicePort}`
      );
      console.log('Service deregistered successfully');
    } catch (error) {
      console.error('Deregistration failed:', error.message);
    }
  }
}

// Usage
const client = new ServiceClient('user-service', 3001);
client.register();

// Graceful shutdown
process.on('SIGINT', async () => {
  await client.deregister();
  process.exit(0);
});
```

### Service Discovery (Node.js)  
```javascript
async function resolveService(serviceName) {
  try {
    const response = await axios.get(`http://localhost:3100/resolve/${serviceName}`);
    const instances = response.data.instances;
    
    if (instances.length === 0) {
      throw new Error(`No healthy instances for ${serviceName}`);
    }
    
    // Return first healthy instance
    return {
      ip: instances[0].ip,
      port: instances[0].port
    };
  } catch (error) {
    console.error('Service resolution failed:', error.message);
    throw error;
  }
}

// Usage
const userService = await resolveService('user-service');
const apiUrl = `http://${userService.ip}:${userService.port}`;
```

## Monitoring & Observability

### Logs
The registry provides detailed logging for:
- Service registrations and deregistrations
- Heartbeat updates
- Cleanup operations
- Service resolution requests
- Error conditions

### Metrics
Available through `/stats` endpoint:
- Total registrations/heartbeats/cleanups
- Active services and instances count
- Service health statistics
- Uptime information

### Health Checks
- Registry health: `GET /health`
- Service health: Automatic heartbeat monitoring
- Dead service cleanup: Automated background process

## Testing

### Using curl

```bash
# Register a service
curl -X POST http://localhost:3100/register \
  -H "Content-Type: application/json" \
  -d '{"name":"test-service","ip":"127.0.0.1","port":4000}'

# Send heartbeat  
curl -X POST http://localhost:3100/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"name":"test-service","ip":"127.0.0.1","port":4000}'

# Resolve service
curl http://localhost:3100/resolve/test-service

# List all services
curl http://localhost:3100/services

# Get statistics
curl http://localhost:3100/stats
```

### Load Testing
The registry is designed to handle high-frequency registrations and heartbeats efficiently with in-memory storage and optimized data structures.

## Production Considerations

1. **Persistence**: Current implementation uses in-memory storage. For production, consider adding persistence options.

2. **Clustering**: For high availability, run multiple registry instances with data synchronization.

3. **Security**: Add authentication for admin endpoints in production.

4. **Metrics**: Integrate with monitoring systems (Prometheus, Grafana).

5. **Performance**: Monitor memory usage and optimize cleanup intervals.

## Error Handling

The registry provides comprehensive error responses:
- **400**: Invalid request data
- **404**: Service/instance not found  
- **500**: Internal server errors

All errors include timestamps and detailed error messages for debugging.

## License

MIT 