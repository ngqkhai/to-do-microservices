# Microservices To-Do Application

A distributed microservices architecture for a To-Do application built with Node.js, featuring service discovery, DNS-based routing, and API gateway patterns.

## 🏗️ Architecture Overview

This project implements a microservices architecture with the following key components:

```
┌─────────────────┐          ┌─────────────────┐           ┌─────────────────┐
│   Client/UI                           │           │   API Gateway                     │           │  DNS Server                        │
│   (Frontend)                        │───▶│   (Port 8080)                        │───▶│  (Port 8600)                         │
└─────────────────┘          └─────────────────┘           └─────────────────┘
                              │                                                    │
                              ▼                                                   ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │ Service Registry                   │    │   Microservices                   │
                    │   (Port 3100)                         │    │                                           │
                    └─────────────────┘    │ • User Service                     │
                                        ▲                              │ • Task Service                      │
                                        │                               │ • Notification                      │
                                        └────────────│ • Reminder                          │
                                                                          └─────────────────┘
```

## 📁 Project Structure

```
To-do/
├── dns-server/              # Custom DNS server for service discovery
├── gateway/                 # API Gateway (reverse proxy)
├── service-registry/        # Service registry and health monitoring
├── services/               # Microservices
│   ├── user/              # User authentication and management
│   ├── task/              # Task management (CRUD operations)
│   ├── notification/      # Notification service
│   └── reminder/          # Reminder and scheduling service
├── start-dev.bat          # Development startup script
├── .gitignore            # Git ignore patterns
└── README.md             # This file
```

## 🔧 Components

### 1. API Gateway (`gateway/`)
**Purpose**: Single entry point for all client requests
- **Port**: 8080
- **Responsibilities**:
  - Route requests to appropriate microservices
  - Service discovery via DNS resolution
  - Load balancing between service instances
  - Request/response logging and monitoring
  - JWT token validation (middleware)

**Key Features**:
- DNS-based service discovery (`user-service.local` → `127.0.0.1:3001`)
- Automatic load balancing between healthy instances
- Request caching and timeout handling
- Proxy middleware for seamless request forwarding

### 2. DNS Server (`dns-server/`)
**Purpose**: Custom DNS resolver for service discovery
- **Port**: 8600 (UDP)
- **Responsibilities**:
  - Resolve `.local` domains to service IP addresses
  - Query service registry for healthy instances
  - Return random healthy instance for load balancing
  - Provide port information via TXT records

**Key Features**:
- Handles A records (IP addresses) and TXT records (port info)
- Integrates with service registry for real-time health status
- TTL-based caching for performance
- Load balancing via random instance selection

### 3. Service Registry (`service-registry/`)
**Purpose**: Central registry for service discovery and health monitoring
- **Port**: 3100
- **Responsibilities**:
  - Service registration and deregistration
  - Health check monitoring
  - Service instance management
  - Provide healthy instances to DNS server

**Key Features**:
- RESTful API for service management
- Periodic health checks with configurable intervals
- Service metadata storage (version, features, etc.)
- Web dashboard for monitoring services

### 4. User Service (`services/user/`)
**Purpose**: User authentication and profile management
- **Port**: 3001
- **Responsibilities**:
  - User registration and login
  - JWT token generation and validation
  - Password hashing and security
  - User profile management

**Key Features**:
- Secure authentication with bcrypt
- JWT-based session management
- Database integration (PostgreSQL/MySQL)
- Swagger API documentation

### 5. Task Service (`services/task/`)
**Purpose**: Task management and CRUD operations
- **Port**: 3002 (when implemented)
- **Responsibilities**:
  - Create, read, update, delete tasks
  - Task categorization and tagging
  - Task assignment and sharing
  - Search and filtering

### 6. Notification Service (`services/notification/`)
**Purpose**: Handle notifications and alerts
- **Port**: 3003 (when implemented)
- **Responsibilities**:
  - Send email notifications
  - Push notifications
  - SMS alerts
  - Notification preferences

### 7. Reminder Service (`services/reminder/`)
**Purpose**: Scheduling and reminders
- **Port**: 3004 (when implemented)
- **Responsibilities**:
  - Schedule task reminders
  - Recurring task management
  - Calendar integration
  - Notification triggers

## 🔄 Complete Workflow

### 1. Service Startup Flow
```
1. Service Registry starts (Port 3100)
2. DNS Server starts and connects to Service Registry (Port 8600)
3. Microservices start and register with Service Registry
4. API Gateway starts and configures DNS client (Port 8080)
5. System ready to handle requests
```

### 2. Request Processing Flow
```
1. Client sends request to API Gateway
   GET http://localhost:8080/user-service/auth/me

2. Gateway parses service name from path
   /user-service/auth/me → service: "user-service", path: "/auth/me"

3. Gateway queries DNS server
   Resolve: user-service.local → IP address

4. DNS server queries Service Registry
   GET http://localhost:3100/registry/resolve/user-service

5. Service Registry returns healthy instances
   [{ ip: "127.0.0.1", port: 3001, status: "healthy" }]

6. DNS server selects random instance and returns IP
   A Record: user-service.local → 127.0.0.1
   TXT Record: user-service.local → port=3001

7. Gateway forwards request to resolved service
   GET http://127.0.0.1:3001/auth/me

8. Service processes request and returns response

9. Gateway forwards response back to client
```

### 3. Service Discovery Process
```
┌─────────────────┐
│ 1. Service                            │
│    Registration                     │
└─────────────────┘
          │
          ▼
┌─────────────────┐           ┌─────────────────┐
│ 2. Health                             │───▶│ 3. DNS Query                      │
│    Monitoring                      │          │    Resolution                         │
└─────────────────┘           └─────────────────┘
          │                      │
          ▼                      ▼
┌─────────────────┐           ┌─────────────────┐
│ 4. Load                                │◀───│ 5. Request                           │
│    Balancing                         │           │    Routing                            │
└─────────────────┘           └─────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Installation
1. Clone the repository:
```bash
git clone <repository-url>
cd To-do
```

2. Install dependencies for all services:
```bash
# Install dependencies for each service
cd service-registry && npm install && cd ..
cd dns-server && npm install && cd ..
cd gateway && npm install && cd ..
cd services/user && npm install && cd ../..
```

3. Set up environment variables:
```bash
# Copy example env files and configure
cp service-registry/.env.example service-registry/.env
cp dns-server/.env.example dns-server/.env
cp gateway/.env.example gateway/.env
cp services/user/.env.example services/user/.env
```

### Running the Application

#### Option 1: Using the Startup Script
```bash
# Start all services in development mode
start-dev.bat
```

#### Option 2: Manual Startup
```bash
# Terminal 1: Start Service Registry
cd service-registry && npm run dev

# Terminal 2: Start DNS Server
cd dns-server && npm run dev

# Terminal 3: Start User Service
cd services/user && npm run dev

# Terminal 4: Start API Gateway
cd gateway && npm run dev
```

### Testing the System
```bash
# Health check
curl http://localhost:8080/health

# Test user service through gateway
curl http://localhost:8080/user-service/auth/me

# Test service registry directly
curl http://localhost:3100/registry/services

# Test DNS resolution directly
dig @127.0.0.1 -p 8600 user-service.local
```

## 📊 Monitoring and Debugging

### Service Registry Dashboard
- Access: `http://localhost:3100`
- View registered services, health status, and metrics

### DNS Server Stats
- Query statistics and cache information
- Service resolution logs

### Gateway Logs
- Request routing and proxy logs
- DNS resolution debugging
- Performance metrics

### Debug Commands
```bash
# Check service registration
curl http://localhost:3100/registry/services

# Test DNS resolution
nslookup user-service.local 127.0.0.1 -port=8600

# Check service health
curl http://localhost:3100/health

# View gateway stats
curl http://localhost:8080/stats
```

## 🔧 Configuration

### Environment Variables
Each service uses environment variables for configuration:

- `PORT`: Service port number
- `HOST`: Service host address
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level
- `DB_URL`: Database connection string

### Service Registry Configuration
- Health check intervals
- Service timeout settings
- Registration requirements

### DNS Server Configuration
- TTL settings
- Cache timeout
- Registry connection settings

### Gateway Configuration
- DNS server settings
- Proxy timeouts
- Load balancing strategy

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Input validation and sanitization

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Test service discovery
npm run test:discovery
```

## 📈 Scaling

### Horizontal Scaling
- Start multiple instances of any service
- DNS server automatically load balances
- Service registry tracks all instances

### Adding New Services
1. Create service in `services/` directory
2. Implement health check endpoint
3. Register with service registry on startup
4. Add DNS resolution support
5. Update gateway routing if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Service not found**: Check service registration in registry
2. **DNS resolution fails**: Verify DNS server is running on port 8600
3. **Connection refused**: Check if target service is running
4. **Port conflicts**: Ensure all services use different ports

### Debug Steps
1. Check service registry for registered services
2. Test DNS resolution directly
3. Verify service health endpoints
4. Check gateway logs for routing issues
5. Monitor network connectivity between services

## 📚 API Documentation

### Gateway Endpoints
- `GET /health` - System health check
- `GET /stats` - Gateway statistics
- `GET /{service-name}/*` - Proxy to microservice

### Service Registry Endpoints
- `GET /registry/services` - List all services
- `GET /registry/resolve/{name}` - Get healthy instances
- `POST /registry/register` - Register service
- `DELETE /registry/deregister` - Deregister service

### User Service Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - User logout
