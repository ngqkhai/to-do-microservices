const { logger } = require('../config/logger');

// Define public paths that don't require authentication
const PUBLIC_PATHS = [
  '/health',
  '/api-docs',
  '/swagger-ui.css',
  '/swagger-ui-bundle.js',
  '/swagger-ui-standalone-preset.js',
  '/swagger-ui-init.js',
  '/favicon-32x32.png',
  '/favicon-16x16.png'
];

const extractUserFromHeaders = (req, res, next) => {
  // Check if it's a public path
  const matchingPath = PUBLIC_PATHS.find(path => req.path.startsWith(path));
  const isRootPath = req.path === '/';
  const isPublicPath = !!matchingPath || isRootPath;

  logger.info('Auth middleware called for path:', {
    path: req.path,
    method: req.method,
    isPublicPath
  });

  // Skip authentication for public paths
  if (isPublicPath) {
    logger.info('Skipping auth for public path:', req.path);
    return next();
  }

  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  const userFullName = req.headers['x-user-full-name'];
  const userRoles = req.headers['x-user-roles'];
  const emailVerified = req.headers['x-user-email-verified'];

  logger.info('Authentication middleware - received headers', {
    method: req.method,
    path: req.path,
    hasUserId: !!userId,
    hasUserEmail: !!userEmail,
    headers: {
      'x-user-id': userId ? 'present' : 'missing',
      'x-user-email': userEmail ? 'present' : 'missing',
      'x-user-full-name': userFullName ? 'present' : 'missing',
      'x-user-roles': userRoles ? 'present' : 'missing',
      'x-user-email-verified': emailVerified ? 'present' : 'missing'
    },
    timestamp: new Date().toISOString()
  });

  if (!userId) {
    logger.warn('Unauthorized request - missing x-user-id header', {
      method: req.method,
      path: req.path,
      allHeaders: Object.keys(req.headers),
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing x-user-id header. Please ensure you are authenticated through the API Gateway or add the x-user-id header manually for testing.'
      }
    });
  }

  req.user = {
    id: userId,
    email: userEmail,
    fullName: userFullName,
    roles: userRoles,
    emailVerified: emailVerified
  };

  logger.info('User authenticated successfully', {
    userId: userId,
    userEmail: userEmail,
    path: req.path,
    timestamp: new Date().toISOString()
  });

  next();
};

module.exports = {
  extractUserFromHeaders
}; 