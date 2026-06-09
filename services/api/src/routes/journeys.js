const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { fetchPNRStatus } = require('../services/pnr-service');
const journeyDb = require('../db/journey-db');

const router = express.Router();

/**
 * POST /api/journeys/pnr
 * Protected. Fetches PNR status and upserts it under the passenger's account.
 */
router.post(
  '/pnr',
  verifyToken,
  [
    body('pnr')
      .isString()
      .withMessage('PNR must be a string')
      .isLength({ min: 10, max: 10 })
      .withMessage('PNR must be exactly 10 digits')
      .isNumeric()
      .withMessage('PNR must be numeric')
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
      const { pnr } = req.body;
      const userId = req.user.user_id;

      // 2. Fetch details from PNR service (external API or mock)
      const pnrData = await fetchPNRStatus(pnr);

      // 3. Upsert journey record in DB
      const journey = await journeyDb.upsertJourney(userId, {
        pnr,
        ...pnrData
      });

      // 4. Return journey details
      return res.status(200).json({
        data: {
          id: journey.id,
          user_id: journey.user_id,
          pnr: journey.pnr,
          train_number: journey.train_number,
          train_name: journey.train_name,
          boarding_station: journey.boarding_station,
          destination_station: journey.destination_station,
          travel_date: journey.travel_date,
          coach: journey.coach,
          berth: journey.berth,
          class: journey.class,
          status: journey.status,
          raw_api_response: journey.raw_api_response,
          created_at: journey.created_at,
          updated_at: journey.updated_at
        },
        message: 'ok'
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/journeys
 * Protected. Returns all journeys for the logged-in passenger, sorted by travel date descending.
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Fetch user journeys
    const journeys = await journeyDb.getJourneysByUserId(userId);

    return res.status(200).json({
      data: journeys,
      message: 'ok'
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
