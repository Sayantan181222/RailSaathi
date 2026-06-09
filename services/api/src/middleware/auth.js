const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware to verify a JWT in the Authorization header.
 */
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header missing or malformed',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'Authorization header missing or malformed',
        code: 'UNAUTHORIZED'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured in environment.');
      return res.status(500).json({
        error: 'Internal server configuration error',
        code: 'SERVER_CONFIG_ERROR'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // payload shape: { user_id, phone }
    return next();
  } catch (error) {
    console.error('JWT Verification failed:', error.message);
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
}

module.exports = {
  verifyToken
};
