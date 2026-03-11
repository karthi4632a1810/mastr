import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';

export const authenticate = async (req, res, next) => {
  try {
    // Allow token via Authorization header (Bearer) or ?token= for streaming endpoints
    const bearer = req.headers.authorization?.split(' ')[1];
    const token = bearer || req.query.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Role-based authorization (backward compatible)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Permission-based authorization
export const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Admin always has access
      if (req.user.role === 'admin') {
        return next();
      }

      // Find role by user's role code
      const role = await Role.findOne({ 
        code: req.user.role.toUpperCase(),
        isActive: true 
      }).populate('permissions');

      if (!role) {
        return res.status(403).json({ 
          success: false, 
          message: 'Role not found or inactive' 
        });
      }

      // Check if role has the required permission
      const hasPermission = role.permissions.some(
        permission => 
          permission.module === module && 
          permission.action === action && 
          permission.isActive
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Required permission: ${module}:${action}` 
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking permissions' 
      });
    }
  };
};

// Combined authorization - checks both role and permission
export const authorizeWithPermission = (module, action, ...fallbackRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Admin always has access
      if (req.user.role === 'admin') {
        return next();
      }

      // Try permission-based check first
      if (module && action) {
        const role = await Role.findOne({ 
          code: req.user.role.toUpperCase(),
          isActive: true 
        }).populate('permissions');

        if (role) {
          const hasPermission = role.permissions.some(
            permission => 
              permission.module === module && 
              permission.action === action && 
              permission.isActive
          );

          if (hasPermission) {
            return next();
          }
        }
      }

      // Fallback to role-based check
      if (fallbackRoles.length > 0 && fallbackRoles.includes(req.user.role)) {
        return next();
      }

      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking authorization' 
      });
    }
  };
};
