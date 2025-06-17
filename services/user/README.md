# Auth Service

A secure authentication microservice built with Node.js, Express, PostgreSQL, and RabbitMQ. This service provides JWT-based authentication with refresh token rotation, user registration, and event publishing for a club management system.

## Features

- **JWT Authentication**: RS256 algorithm with asymmetric key pairs
- **Refresh Token Rotation**: Secure token management with automatic rotation
- **User Registration & Login**: Complete user lifecycle management
- **Event Publishing**: RabbitMQ integration for user events
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation with Joi
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Security**: Helmet, CORS, secure cookies, and password hashing
- **Testing**: Unit and integration tests with Jest

## Architecture

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│                API Gateway        │────│           Auth Service              │────│            PostgreSQL              │
└─────────────────┘          └─────────────────┘          └─────────────────┘
                                                                                   │
                                                                                   │
                                                           ┌─────────────────┐
                                                            │               RabbitMQ             │
                                                           └─────────────────┘
```

## Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- RabbitMQ 3.8+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   cd services/auth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate RSA key pairs**
   ```bash
   npm run generate-keys
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/club_management_auth
   JWT_PRIVATE_KEY_PATH=src/config/keys/private.pem
   JWT_PUBLIC_KEY_PATH=src/config/keys/public.pem
   RABBITMQ_URL=amqp://localhost:5672
   PORT=3001
   NODE_ENV=development
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Start the service**
   ```bash
   npm run dev
   ```

## API Endpoints

### Public Endpoints

#### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "message": "User registered"
}
```

**Error Responses:**
- `400` - Validation failed
- `409` - Email already exists

#### POST /auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "jwt_token_here"
}
```

**Note:** Refresh token is set as HTTP-only cookie.

#### POST /auth/refresh
Refresh access token using refresh token cookie.

**Response (200):**
```json
{
  "access_token": "new_jwt_token_here"
}
```

### Protected Endpoints

#### GET /auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "roles": ["member"],
  "email_verified": false,
  "last_login": "2023-12-01T10:00:00Z",
  "created_at": "2023-12-01T09:00:00Z"
}
```

#### POST /auth/logout
Logout and revoke refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Logged out"
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- Must contain uppercase letters
- Must contain lowercase letters
- Must contain numbers
- Must contain special characters

### JWT Tokens
- **Access Token**: 15 minutes TTL, RS256 signed
- **Refresh Token**: 7 days TTL, stored in database, HTTP-only cookie

### Rate Limiting
- **Registration**: 3 attempts per hour per IP
- **Login**: 5 attempts per 15 minutes per IP
- **General Auth**: 10 attempts per 15 minutes per IP
- **Token Refresh**: 50 attempts per 15 minutes per IP

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Cookie security (HttpOnly, Secure, SameSite)

## Event Publishing

The service publishes events to RabbitMQ for other microservices:

### UserRegistered Event
```json
{
  "eventType": "UserRegistered",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "roles": ["member"],
    "registeredAt": "2023-12-01T10:00:00Z"
  },
  "timestamp": "2023-12-01T10:00:00Z",
  "version": "1.0"
}
```

## Database Schema

### Users Table
- `id` - UUID primary key
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `full_name` - User's full name
- `roles` - Array of user roles
- `is_active` - Account status
- `email_verified` - Email verification status
- `last_login` - Last login timestamp
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### Refresh Tokens Table
- `id` - UUID primary key
- `token` - UUID refresh token
- `user_id` - Foreign key to users
- `expires_at` - Token expiration
- `is_active` - Token status
- `revoked_at` - Revocation timestamp
- `user_agent` - Client user agent
- `ip_address` - Client IP address
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

## Testing

Run tests:
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure
- `tests/unit/` - Unit tests for services and utilities
- `tests/integration/` - Integration tests for controllers and routes

## Development

### Project Structure
```
src/
├── config/
│   ├── env.js              # Environment configuration
│   ├── database.js         # Database configuration
│   └── keys/               # JWT key pairs
├── migrations/             # Database migrations
├── models/                 # Sequelize models
│   ├── index.js
│   ├── User.js
│   └── RefreshToken.js
├── repositories/           # Data access layer
│   ├── userRepo.js
│   └── tokenRepo.js
├── services/               # Business logic
│   └── authService.js
├── controllers/            # Route handlers
│   └── authController.js
├── middlewares/            # Express middlewares
│   ├── jwtValidate.js
│   ├── errorHandler.js
│   └── rateLimiter.js
├── events/                 # Event publishing
│   └── publisher.js
├── routes/                 # Route definitions
│   └── authRoutes.js
└── index.js               # Application entry point
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run migrate` - Run database migrations
- `npm run generate-keys` - Generate JWT key pairs

## Production Deployment

1. **Environment Variables**: Set all required environment variables
2. **Database**: Run migrations in production environment
3. **Keys**: Generate production RSA key pairs
4. **Security**: Enable HTTPS and secure cookies
5. **Monitoring**: Set up logging and monitoring
6. **Load Balancing**: Configure load balancer with session affinity for refresh tokens

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 400 | Bad Request | Invalid input or validation failed |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 409 | Conflict | Resource already exists (e.g., email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00Z",
  "service": "auth-service",
  "version": "1.0.0"
}
```

## Contributing

1. Follow the existing code structure and patterns
2. Write tests for new features
3. Use conventional commit messages
4. Update documentation for API changes

## License

MIT License 