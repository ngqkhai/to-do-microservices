const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

class JWTAuthMiddleware {
  constructor() {
    this.publicKey = null;
    this.secret = config.JWT_SECRET;
    this.loadPublicKey();
  }

  loadPublicKey() {
    try {
      if (config.JWT_PUBLIC_KEY_PATH && fs.existsSync(config.JWT_PUBLIC_KEY_PATH)) {
        this.publicKey = fs.readFileSync(config.JWT_PUBLIC_KEY_PATH, 'utf8');
        console.log('JWT public key loaded successfully');
      } else {
        console.log('JWT public key not found, using secret key for validation');
      }
    } catch (error) {
      console.error('Error loading JWT public key:', error.message);
    }
  }

  extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Check for "Bearer " prefix
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Return the token as is if no Bearer prefix
    return authHeader;
  }

  validateToken(token) {
    try {
      // Use public key if available (RS256), otherwise use secret (HS256)
      const key = this.publicKey || this.secret;
      const algorithm = this.publicKey ? 'RS256' : 'HS256';
      
      const decoded = jwt.verify(token, key, { algorithms: [algorithm] });
      return { valid: true, decoded };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message,
        type: error.name 
      };
    }
  }

  // Add user information to request headers for service forwarding
  addUserHeaders(req, user) {
    // Add user information to headers that services can read
    req.headers['x-user-id'] = user.sub || user.id;
    req.headers['x-user-email'] = user.email;
    req.headers['x-user-full-name'] = user.full_name;
    req.headers['x-user-roles'] = Array.isArray(user.roles) ? user.roles.join(',') : user.roles;
    req.headers['x-user-email-verified'] = user.email_verified ? 'true' : 'false';
    
    // Add additional metadata
    req.headers['x-gateway-authenticated'] = 'true';
    req.headers['x-gateway-timestamp'] = new Date().toISOString();
  }

  middleware() {
    return (req, res, next) => {
      // Extract token from Authorization header
      const token = this.extractToken(req);

      if (!token) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Access token is required'
        });
      }

      // Validate token
      const validation = this.validateToken(token);

      if (!validation.valid) {
        console.log(`JWT validation failed: ${validation.error}`);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired access token'
        });
      }

      // Add user info to request
      req.user = validation.decoded;
      req.token = token;

      // Add user information to headers for service forwarding
      this.addUserHeaders(req, validation.decoded);

      console.log(`✅ JWT validated for user: ${validation.decoded.email} (${validation.decoded.sub})`);

      next();
    };
  }

  // Optional middleware for routes that don't require authentication
  optionalAuth() {
    return (req, res, next) => {
      const token = this.extractToken(req);

      if (token) {
        const validation = this.validateToken(token);
        if (validation.valid) {
          req.user = validation.decoded;
          req.token = token;
          
          // Add user headers even for optional auth
          this.addUserHeaders(req, validation.decoded);
          
          console.log(`✅ Optional JWT validated for user: ${validation.decoded.email}`);
        } else {
          console.log(`⚠️  Optional JWT validation failed: ${validation.error}`);
        }
      }

      next();
    };
  }

  // Middleware to remove sensitive headers before forwarding
  cleanupHeaders() {
    return (req, res, next) => {
      // Remove the original Authorization header since services don't need it
      // Services will use the x-user-* headers instead
      delete req.headers.authorization;
      
      next();
    };
  }
}

module.exports = new JWTAuthMiddleware(); 