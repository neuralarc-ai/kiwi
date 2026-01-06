import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.error('❌ No token provided in request');
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


