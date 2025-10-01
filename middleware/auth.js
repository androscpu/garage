const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid or inactive user',
        code: 'INVALID_USER'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

const checkHotelAccess = async (req, res, next) => {
  try {
    const hotelId = req.params.hotelId || req.body.hotelId || req.query.hotelId;
    
    if (!hotelId) {
      return res.status(400).json({ 
        error: 'Hotel ID required',
        code: 'HOTEL_ID_REQUIRED'
      });
    }

    // Super admin can access any hotel
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Other users can only access their assigned hotel
    if (req.user.hotelId !== hotelId) {
      return res.status(403).json({ 
        error: 'Access denied to this hotel',
        code: 'HOTEL_ACCESS_DENIED'
      });
    }

    next();
  } catch (error) {
    logger.error('Hotel access check error:', error);
    return res.status(500).json({ 
      error: 'Access check failed',
      code: 'ACCESS_CHECK_ERROR'
    });
  }
};

module.exports = {
  authenticateToken,
  authorize,
  checkHotelAccess
};