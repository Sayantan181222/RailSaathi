const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { verifyFirebaseToken } = require('../middleware/firebase-auth');
const { verifyToken } = require('../middleware/auth');
const userDb = require('../db/user-db');

const router = express.Router();

/**
 * POST /api/auth/verify-otp
 * Verifies a Firebase ID token, finds or creates a user record, and issues a JWT.
 */
router.post(
  '/verify-otp',
  [
    body('phone')
      .isString()
      .withMessage('Phone must be a string')
      .isLength({ min: 10, max: 10 })
      .withMessage('Phone must be exactly 10 digits')
      .isNumeric()
      .withMessage('Phone must be numeric'),
    body('firebase_id_token')
      .isString()
      .withMessage('Firebase token must be a string')
      .notEmpty()
      .withMessage('Firebase ID token is required')
  ],
  async (req, res, next) => {
    // 1. Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array().map((err) => ({
          field: err.param || err.path,
          message: err.msg
        }))
      });
    }

    try {
      const { phone, firebase_id_token } = req.body;

      // 2. Verify Firebase token
      let decodedToken;
      try {
        decodedToken = await verifyFirebaseToken(firebase_id_token);
      } catch (verifyError) {
        console.error('Firebase verify OTP request failed.');
        return res.status(401).json({
          error: 'Firebase token verification failed',
          code: 'FIREBASE_TOKEN_INVALID'
        });
      }

      const firebaseUid = decodedToken.uid;

      // 3. Check if user already exists
      let user = await userDb.getUserByFirebaseUid(firebaseUid);
      let isNew = false;

      if (!user) {
        // Create user record
        user = await userDb.createUser({ phone, firebase_uid: firebaseUid });
        isNew = true;
      }

      // 4. Generate JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET is missing from environment.');
        return res.status(500).json({
          error: 'Internal server configuration error',
          code: 'SERVER_CONFIG_ERROR'
        });
      }

      const token = jwt.sign(
        { user_id: user.id, phone: user.phone },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // 5. Send successful response
      return res.status(200).json({
        data: {
          token,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name || null,
            is_new: isNew,
            is_verified: user.is_verified || false
          }
        },
        message: 'ok'
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/auth/complete-profile
 * Protected route to save user name and emergency contacts after first login.
 */
router.post(
  '/complete-profile',
  verifyToken,
  [
    body('name')
      .isString()
      .withMessage('Name must be a string')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('emergency_contacts')
      .optional()
      .isArray({ max: 3 })
      .withMessage('Emergency contacts must be an array with at most 3 items'),
    body('emergency_contacts.*')
      .isString()
      .isLength({ min: 10, max: 10 })
      .isNumeric()
      .withMessage('Each emergency contact must be a 10-digit numeric string')
  ],
  async (req, res, next) => {
    // 1. Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array().map((err) => ({
          field: err.param || err.path,
          message: err.msg
        }))
      });
    }

    try {
      const { name, emergency_contacts } = req.body;
      const userId = req.user.user_id;

      // 2. Update user profile in database
      const updatedUser = await userDb.updateUser(userId, {
        name,
        emergency_contacts: emergency_contacts || [],
        is_verified: true
      });

      // 3. Return response
      return res.status(200).json({
        data: {
          user: {
            id: updatedUser.id,
            phone: updatedUser.phone,
            name: updatedUser.name,
            emergency_contacts: updatedUser.emergency_contacts,
            is_verified: updatedUser.is_verified,
            preferred_class: updatedUser.preferred_class
          }
        },
        message: 'ok'
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
