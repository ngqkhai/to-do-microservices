// Since API Gateway handles JWT verification, this middleware extracts user info from headers
// that the Gateway adds after successful JWT verification

const extractUserFromHeaders = (req, res, next) => {
  try {
    // Gateway adds user information to headers after JWT verification
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userFullName = req.headers['x-user-full-name'];
    const userRoles = req.headers['x-user-roles'];
    const emailVerified = req.headers['x-user-email-verified'];
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication required'
      });
    }
      
      // Add user information to request object
      req.user = {
      id: userId,
      email: userEmail,
      full_name: userFullName,
      roles: userRoles ? userRoles.split(',') : [],
      email_verified: emailVerified === 'true'
      };

      next();
  } catch (error) {
    console.error('User extraction error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'User authentication service error'
    });
  }
};

// Middleware to check for specific roles
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware to check if user email is verified
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (!req.user.email_verified) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Email verification required'
    });
  }

  next();
};

// Optional middleware that extracts user info if available
const optionalUserExtract = (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return next(); // Continue without user info
    }

    const userEmail = req.headers['x-user-email'];
    const userFullName = req.headers['x-user-full-name'];
    const userRoles = req.headers['x-user-roles'];
    const emailVerified = req.headers['x-user-email-verified'];

      req.user = {
      id: userId,
      email: userEmail,
      full_name: userFullName,
      roles: userRoles ? userRoles.split(',') : [],
      email_verified: emailVerified === 'true'
    };

    next();
  } catch (error) {
    console.error('Optional user extraction error:', error);
    next(); // Continue even if there's an error
  }
};

module.exports = {
  jwtValidate: extractUserFromHeaders, // Keep same name for backward compatibility
  extractUserFromHeaders,
  requireRole,
  requireEmailVerified,
  optionalJwtValidate: optionalUserExtract // Keep same name for backward compatibility
}; 