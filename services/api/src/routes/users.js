const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const userDb = require('../db/user-db');
const journeyDb = require('../db/journey-db');

const router = express.Router();

/**
 * GET /api/users/me
 * Protected. Returns full profile + active journey of the logged-in passenger.
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // 1. Fetch user profile
    const user = await userDb.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // 2. Fetch active/upcoming journey
    const activeJourney = await journeyDb.getActiveJourney(userId);

    // 3. Return response
    return res.status(200).json({
      data: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        emergency_contacts: user.emergency_contacts,
        preferred_class: user.preferred_class,
        frequent_routes: user.frequent_routes,
        is_verified: user.is_verified,
        active_journey: activeJourney || null
      },
      message: 'ok'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/users/me
 * Protected. Allows user to update their own profile.
 */
router.patch(
  '/me',
  verifyToken,
  // 1. Strict Whitelist Check Middleware
  (req, res, next) => {
    const whitelist = ['name', 'emergency_contacts', 'preferred_class'];
    const bodyKeys = Object.keys(req.body);
    for (const key of bodyKeys) {
      if (!whitelist.includes(key)) {
        return res.status(400).json({
          error: `Unknown field: ${key}`,
          code: 'VALIDATION_ERROR'
        });
      }
    }
    return next();
  },
  // 2. express-validator Schemas
  [
    body('name')
      .optional()
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
      .withMessage('Each emergency contact must be a 10-digit numeric string'),
    body('preferred_class')
      .optional()
      .isString()
      .isIn(['SL', '3A', '2A', '1A', 'GEN'])
      .withMessage('Preferred class must be one of: SL, 3A, 2A, 1A, GEN')
  ],
  async (req, res, next) => {
    // 3. Evaluate express-validator results
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
      const userId = req.user.user_id;
      const { name, emergency_contacts, preferred_class } = req.body;

      // Extract only provided updates
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (emergency_contacts !== undefined) updates.emergency_contacts = emergency_contacts;
      if (preferred_class !== undefined) updates.preferred_class = preferred_class;

      // 4. Perform database update
      const updatedUser = await userDb.updateUser(userId, updates);

      // 5. Send updated profile payload (no active_journey in response)
      return res.status(200).json({
        data: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          name: updatedUser.name,
          emergency_contacts: updatedUser.emergency_contacts,
          preferred_class: updatedUser.preferred_class,
          frequent_routes: updatedUser.frequent_routes,
          is_verified: updatedUser.is_verified
        },
        message: 'ok'
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
