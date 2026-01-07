import jwt from 'jsonwebtoken';

// List of public routes that don't require authentication
// NOTE: /api/auth/register is now PROTECTED - only admins can create users
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register-first', // Only for first admin setup
  '/api/health',
  '/api/test-public',
  '/api/version',
];

// Check if a route is public
const isPublicRoute = (path) => {
  if (!path) return false;
  
  // Remove query string for comparison
  const pathWithoutQuery = path.split('?')[0];
  
  // Check exact match or prefix match
  const isPublic = PUBLIC_ROUTES.some(route => {
    // Exact match
    if (pathWithoutQuery === route) return true;
    // Prefix match (for routes like /api/auth/register with additional path)
    if (pathWithoutQuery.startsWith(route + '/')) return true;
    return false;
  });
  
  return isPublic;
};

export const authenticate = (req, res, next) => {
  // Log the incoming request
  const requestPath = req.originalUrl || req.path;
  console.log('🔐 Authenticate middleware called:', {
    method: req.method,
    path: requestPath,
    originalUrl: req.originalUrl,
    url: req.url,
    isPublic: isPublicRoute(requestPath),
    hasAuthHeader: !!req.headers.authorization
  });

  // Skip authentication for public routes
  if (isPublicRoute(requestPath)) {
    console.log('✅ Public route detected - skipping authentication:', requestPath);
    return next();
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.error('❌ No token provided in request for protected route:', requestPath);
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('✅ User authenticated:', { id: decoded.id, email: decoded.email, role: decoded.role });
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('❌ No user in request (authorize middleware)');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('🔐 Authorization check:', { 
      userRole: req.user.role, 
      allowedRoles: roles,
      hasAccess: roles.includes(req.user.role)
    });

    if (!roles.includes(req.user.role)) {
      console.error('❌ Access denied:', { 
        userRole: req.user.role, 
        requiredRoles: roles 
      });
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    console.log('✅ Authorization granted');
    next();
  };
};


