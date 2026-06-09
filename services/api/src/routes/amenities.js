const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const supabase = require('../db/supabase-client');
const { verifyToken } = require('../middleware/auth');
const {
  calculateCrowdingScore,
  getCrowdingLabel,
  getAlternateTrains,
  SURGE_INTENT_THRESHOLD
} = require('../services/demand-service');

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: errors.array() });
  }
  next();
};

const isUppercase = (value) => value === value.toUpperCase();

// ENDPOINT C: GET /api/amenities/station/:code (Public)
// Registered BEFORE /:id routes
router.get(
  '/station/:code',
  [
    param('code').isLength({ min: 2, max: 7 }).withMessage('Code must be 2-7 characters')
  ],
  validate,
  async (req, res) => {
    try {
      const { code } = req.params;

      // Fetch station_name from station_coordinates
      const { data: stationData, error: stationError } = await supabase
        .from('station_coordinates')
        .select('station_code, station_name, lat, lng')
        .eq('station_code', code)
        .single();

      if (stationError || !stationData) {
        return res.status(404).json({ error: 'Station not found.', code: 'STATION_NOT_FOUND' });
      }

      // Fetch amenities
      const { data: amenities, error: amenitiesError } = await supabase
        .from('amenities')
        .select('*')
        .eq('station_code', code);

      if (amenitiesError) throw amenitiesError;

      // Fetch vendors
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .eq('station_code', code)
        .eq('is_active', true);

      if (vendorsError) throw vendorsError;

      res.set('Cache-Control', 'public, max-age=60');
      return res.status(200).json({
        data: {
          station_code: stationData.station_code,
          station_name: stationData.station_name,
          amenities: amenities || [],
          vendors: vendors || []
        },
        message: 'ok'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
);

// ENDPOINT A: POST /api/amenities/intent (Protected)
router.post(
  '/intent',
  verifyToken,
  [
    body('from_station')
      .notEmpty()
      .isLength({ max: 7 })
      .custom(isUppercase).withMessage('Must be uppercase'),
    body('to_station')
      .notEmpty()
      .isLength({ max: 7 })
      .custom(isUppercase).withMessage('Must be uppercase')
      .custom((value, { req }) => value !== req.body.from_station).withMessage('to_station must be different from from_station'),
    body('travel_date')
      .isDate()
      .custom((value) => {
        const today = new Date().toISOString().slice(0, 10);
        return value >= today;
      }).withMessage('Travel date must be today or in the future'),
    body('class').optional().default('GEN')
  ],
  validate,
  async (req, res) => {
    try {
      const { from_station, to_station, travel_date } = req.body;
      const train_class = req.body.class || 'GEN';
      const user_id = req.user.user_id;

      // 1. Count existing intents
      const { count, error: countError } = await supabase
        .from('travel_intents')
        .select('id', { count: 'exact', head: true })
        .eq('from_station', from_station)
        .eq('to_station', to_station)
        .eq('travel_date', travel_date);

      if (countError && countError.code !== 'PGRST116') throw countError;

      // 2. Calculate score
      const score = calculateCrowdingScore(from_station, to_station, travel_date, count || 0);

      // 3. Get label
      const label = getCrowdingLabel(score);

      // 4. Surge detection
      const is_surge_route = score >= 8;

      // 5. Insert intent
      const { data: intent, error: insertError } = await supabase
        .from('travel_intents')
        .insert({
          user_id,
          from_station,
          to_station,
          travel_date,
          class: train_class,
          crowding_score: score,
          crowding_label: label,
          is_surge_route
        })
        .select()
        .single();

      if (insertError) {
        // Handle unique constraint violation
        if (insertError.code === '23505') {
          return res.status(409).json({ error: 'Intent already declared for this date and route.', code: 'DUPLICATE_INTENT' });
        }
        throw insertError;
      }

      // 6. Get alternate trains
      const alternate_trains = getAlternateTrains(from_station, to_station);

      // 7. Return 201
      return res.status(201).json({
        data: {
          ...intent,
          alternate_trains
        },
        message: 'Intent declared successfully.'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
);

// ENDPOINT B: GET /api/amenities/intents (Protected)
router.get(
  '/intents',
  verifyToken,
  async (req, res) => {
    try {
      const user_id = req.user.user_id;

      const { data: intents, error } = await supabase
        .from('travel_intents')
        .select('*')
        .eq('user_id', user_id)
        .order('travel_date', { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        data: intents || [],
        message: 'ok'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  }
);

// Fallback for /intent/my to match PROGRESS.md
router.get('/intent/my', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { data: intents, error } = await supabase
      .from('travel_intents')
      .select('*')
      .eq('user_id', user_id)
      .order('travel_date', { ascending: true });
    if (error) throw error;
    return res.status(200).json({ data: intents || [], message: 'ok' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// Additional routes are in amenities-extra.js
// Member 1 must also add: app.use('/api/amenities', require('./routes/amenities-extra'))
module.exports = router;
