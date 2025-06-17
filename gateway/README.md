# API Gateway

A Node.js Express-based API Gateway with JWT validation and DNS-based service discovery for microservices architecture.

## Features

- **JWT Authentication**: Validates JWT tokens from Authorization header
- **DNS-based Service Discovery**: Resolves service names using custom DNS server
- **Request Proxying**: Forwards requests to target microservices
- **Comprehensive Logging**: Logs all requests and responses
- **Statistics Tracking**: Tracks gateway performance and usage
- **DNS Caching**: Caches DNS resolutions for better performance
- **Error Handling**: Comprehensive error handling and reporting
- **Health Monitoring**: Built-in health checks and monitoring endpoints

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────────┐
│   Client    │───▶│ API Gateway  │───▶│ DNS Server  │───▶│  Microservice   │
│             │    │  (Port 8080) │    │ (Port 8600) │    │  (Dynamic Port) │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────────┘
```

## Installation

1. **Install dependencies**
   ```bash
   cd gateway
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   PORT=8080
   JWT_SECRET=your-super-secret-jwt-key-here
   DNS_SERVER_HOST=127.0.0.1
   DNS_SERVER_PORT=8600
   DEFAULT_SERVICE_PORT=3000
   ```

3. **Start the gateway**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Usage

### Request Flow

1. **Client sends request** to `http://localhost:8080/service-name/endpoint`
2. **Gateway extracts JWT** from `Authorization: Bearer <token>` header
3. **Gateway validates JWT** using secret key or public key
4. **Gateway parses service name** from URL path
5. **Gateway resolves service** using DNS: `service-name.local`
6. **Gateway forwards request** to resolved service
7. **Gateway returns response** to client

### URL Pattern

```
http://localhost:8080/{service-name}/{service-endpoint}
```

**Examples:**
- `GET http://localhost:8080/user-service/auth/me`
- `POST http://localhost:8080/task-service/api/tasks`
- `PUT http://localhost:8080/notification-service/api/settings`

### Authentication

Include JWT token in Authorization header:
```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:8080/user-service/auth/me
```

## API Endpoints

### Gateway Management

#### GET /gateway/health
Health check endpoint.
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00Z",
  "service": "api-gateway",
  "version": "1.0.0",
  "uptime": 3600
}
```

#### GET /gateway/info
Gateway information and usage.
```json
{
  "service": "API Gateway",
  "version": "1.0.0",
  "description": "Node.js Express API Gateway with JWT validation and DNS-based service discovery",
  "features": ["JWT Authentication", "DNS-based Service Discovery", "..."],
  "endpoints": { "health": "/gateway/health", "..." }
}
```

#### GET /gateway/stats
Gateway statistics and performance metrics.
```json
{
  "totalRequests": 1250,
  "successfulRequests": 1200,
  "failedRequests": 50,
  "dnsErrors": 5,
  "authErrors": 30,
  "proxyErrors": 15,
  "uptime": 3600,
  "activeRequests": { "count": 3, "requests": [...] },
  "dnsCache": { "total": 10, "valid": 8, "expired": 2 }
}
```

#### DELETE /gateway/stats
Reset gateway statistics.

#### GET /gateway/dns-cache
DNS cache information.

#### DELETE /gateway/dns-cache
Clear DNS cache.
- Query param `service`: Clear cache for specific service
- No param: Clear entire cache

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Gateway port |
| `NODE_ENV` | `development` | Environment |
| `JWT_SECRET` | `your-super-secret-jwt-key-here` | JWT secret key |
| `JWT_PUBLIC_KEY_PATH` | - | Path to JWT public key (optional) |
| `DNS_SERVER_HOST` | `127.0.0.1` | DNS server host |
| `DNS_SERVER_PORT` | `8600` | DNS server port |
| `DEFAULT_SERVICE_PORT` | `3000` | Default service port |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | CORS origins |

### JWT Configuration

The gateway supports both:
- **HS256** (symmetric): Using `JWT_SECRET`
- **RS256** (asymmetric): Using `JWT_PUBLIC_KEY_PATH`

For production, use RS256 with public key from your auth service.

### DNS Resolution

The gateway queries DNS for:
1. **A records**: Service IP address (`service-name.local`)
2. **SRV records**: Service port (`_http._tcp.service-name.local`)

If SRV record is not found, uses `DEFAULT_SERVICE_PORT`.

## Request Headers

### Incoming Headers (from client)
- `Authorization: Bearer <token>` - JWT token (required)
- `Content-Type` - Request content type
- Standard HTTP headers

### Forwarded Headers (to service)
- All original headers (except hop-by-hop)
- `X-Forwarded-For` - Client IP
- `X-Forwarded-Proto` - Request protocol
- `X-Forwarded-Host` - Original host
- `X-Gateway-Request-ID` - Unique request ID
- `X-User-ID` - User ID (from JWT)
- `X-User-Email` - User email (from JWT)
- `X-User-Roles` - User roles (from JWT)

### Response Headers (to client)
- All service response headers
- `X-Gateway-Processed: true` - Gateway processed flag
- `X-Gateway-Duration` - Processing time
- `X-Gateway-Service` - Target service name
- `X-Gateway-Request-ID` - Request ID

## Error Handling

### HTTP Status Codes

| Code | Description | Cause |
|------|-------------|--------|
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Invalid route or service |
| `502` | Bad Gateway | Service connection failed |
| `503` | Service Unavailable | DNS resolution failed |
| `500` | Internal Server Error | Gateway error |

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "service": "service-name",
  "timestamp": "2023-12-01T10:00:00Z"
}
```

## Performance Features

### DNS Caching
- Cache TTL: 30 seconds
- Automatic cache invalidation
- Fallback to expired cache on DNS failure

### Request Tracking
- Unique request IDs
- Performance monitoring
- Active request tracking
- Automatic cleanup of stale requests

### Connection Management
- Request timeout: 30 seconds
- Connection pooling via axios
- Graceful shutdown handling

## Testing

### Using curl

```bash
# Health check
curl http://localhost:8080/gateway/health

# Authenticated request
curl -H "Authorization: Bearer <token>" \
     http://localhost:8080/user-service/auth/me

# Statistics
curl http://localhost:8080/gateway/stats

# Clear DNS cache
curl -X DELETE http://localhost:8080/gateway/dns-cache
```

### Using Postman

1. Set base URL: `http://localhost:8080`
2. Add Authorization header: `Bearer <your-jwt-token>`
3. Test endpoints: `/service-name/endpoint`

## Monitoring

### Logs

The gateway provides comprehensive logging:
- Request/response logging
- DNS resolution logs
- Error logs with stack traces
- Performance metrics

### Metrics

Available through `/gateway/stats`:
- Request counts (total, success, failed)
- Error breakdowns (DNS, auth, proxy)
- Active request tracking
- DNS cache statistics
- Uptime information

## Production Considerations

1. **Security**
   - Use RS256 JWT with public key
   - Configure proper CORS origins
   - Enable HTTPS termination
   - Use environment variables for secrets

2. **Performance**
   - Tune DNS cache TTL
   - Configure connection pooling
   - Monitor memory usage
   - Set up proper logging

3. **Reliability**
   - Health check endpoints
   - Graceful shutdown
   - Error monitoring
   - Circuit breaker patterns (future enhancement)

## Development

### Project Structure

```
gateway/
├── src/
│   ├── config/
│   │   └── env.js              # Environment configuration
│   ├── middleware/
│   │   ├── jwtAuth.js          # JWT authentication
│   │   └── proxyMiddleware.js  # Main proxy logic
│   ├── services/
│   │   ├── dnsResolver.js      # DNS resolution
│   │   └── proxyService.js     # Request forwarding
│   ├── routes/
│   │   └── gatewayRoutes.js    # Gateway management routes
│   └── index.js                # Main application
├── package.json
├── .env
└── README.md
```

### Scripts

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
npm test         # Run tests
```

## License

MIT 