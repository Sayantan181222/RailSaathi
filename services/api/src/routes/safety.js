const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { deriveMaskedInitials } = require('../services/safety-service');
const { sendSOS } = require('../services/twilioService');
const supabase = require('../db/supabase-client');
const { verifyToken } = require('../middleware/auth');

/**
 * Helper to handle validation errors and format them.
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
}

/**
 * 1. POST /api/safety/sos (protected)
 * Triggers an emergency SOS alert.
 */
router.post(
  '/sos',
  verifyToken,
  [
    body('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat must be a number between -90 and 90'),
    body('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('lng must be a number between -180 and 180'),
    body('alert_subtype')
      .isIn(['PERSONAL_SAFETY', 'MEDICAL', 'THEFT', 'OTHER'])
      .withMessage('alert_subtype must be one of PERSONAL_SAFETY, MEDICAL, THEFT, OTHER'),
    body('train_number').optional().isString(),
    body('coach').optional().isString(),
    body('berth').optional().isString(),
    body('station_code').optional().isString(),
    body('description').optional().isString(),
    body('photo_url').optional().isString(),
    body('audio_url').optional().isString(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      // Get user from supabase
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.user_id)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          error: userError ? userError.message : 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const insertObject = {
        user_id: req.user.user_id,
        event_type: 'SOS',
        priority: 'CRITICAL',
        status: 'ACTIVE',
        masked_initials: deriveMaskedInitials(user.name),
        lat: req.body.lat,
        lng: req.body.lng,
        alert_subtype: req.body.alert_subtype,
        train_number: req.body.train_number,
        coach: req.body.coach,
        berth: req.body.berth,
        station_code: req.body.station_code,
        description: req.body.description,
        photo_url: req.body.photo_url,
        audio_url: req.body.audio_url,
      };

      const { data: createdEvent, error: insertError } = await supabase
        .from('safety_events')
        .insert(insertObject)
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({
          error: insertError.message,
          code: 'DATABASE_ERROR'
        });
      }

      res.status(201).json({
        data: createdEvent,
        message: 'SOS alert sent. Help is on the way.'
      });

      // Fire SMS after response using setImmediate
      setImmediate(async () => {
        try {
          const contacts = user.emergency_contacts;
          let smsContactsCount = 0;

          if (Array.isArray(contacts) && contacts.length > 0) {
            const smsPromises = contacts.map(async (contact) => {
              const phone = typeof contact === 'string' ? contact : (contact.phone || contact.phone_number || contact.phoneNumber);
              if (phone) {
                smsContactsCount++;
                return sendSOS(
                  phone,
                  user.name || 'Passenger',
                  createdEvent.train_number,
                  createdEvent.coach,
                  createdEvent.berth,
                  createdEvent.lat,
                  createdEvent.lng
                );
              }
            });

            await Promise.all(smsPromises.filter(Boolean));
          }

          await supabase
            .from('safety_events')
            .update({
              sms_sent: smsContactsCount > 0,
              sms_contacts_count: smsContactsCount
            })
            .eq('id', createdEvent.id);

        } catch (bgError) {
          console.error('Error sending background SOS SMS messages:', bgError);
        }
      });

    } catch (error) {
      console.error('Error handling SOS alert:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * 2. PATCH /api/safety/sos/:id/audio (protected)
 * Updates the audio URL of an SOS event.
 */
router.patch(
  '/sos/:id/audio',
  verifyToken,
  [
    body('audio_url')
      .isString()
      .custom((value) => typeof value === 'string' && value.startsWith('https://'))
      .withMessage('audio_url must start with https://'),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { data: event, error: fetchError } = await supabase
        .from('safety_events')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !event) {
        return res.status(404).json({
          error: 'Event not found',
          code: 'EVENT_NOT_FOUND'
        });
      }

      if (event.user_id !== req.user.user_id) {
        return res.status(403).json({
          error: 'Access denied: Event does not belong to you',
          code: 'FORBIDDEN'
        });
      }

      if (event.event_type !== 'SOS') {
        return res.status(400).json({
          error: 'Invalid operation: Event is not an SOS type',
          code: 'INVALID_EVENT_TYPE'
        });
      }

      const { data: updatedEvent, error: updateError } = await supabase
        .from('safety_events')
        .update({
          audio_url: req.body.audio_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          error: updateError.message,
          code: 'DATABASE_ERROR'
        });
      }

      return res.status(200).json({
        data: updatedEvent,
        message: 'Audio URL updated successfully.'
      });

    } catch (error) {
      console.error('Error updating SOS audio URL:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * 3. POST /api/safety/compartment-alert (protected)
 * Reports a violation in the compartment.
 */
router.post(
  '/compartment-alert',
  verifyToken,
  [
    body('train_number').isString().notEmpty().withMessage('train_number is required'),
    body('coach').isString().notEmpty().withMessage('coach is required'),
    body('alert_subtype')
      .isIn(['MALE_OCCUPANT', 'HARASSMENT', 'THREATENING_BEHAVIOUR'])
      .withMessage('alert_subtype must be one of MALE_OCCUPANT, HARASSMENT, THREATENING_BEHAVIOUR'),
    body('berth').optional().isString(),
    body('description').optional().isString(),
    body('photo_url').optional().isString(),
    body('audio_url').optional().isString(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.user_id)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          error: userError ? userError.message : 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const insertObject = {
        user_id: req.user.user_id,
        event_type: 'COMPARTMENT_VIOLATION',
        priority: 'HIGH',
        status: 'ACTIVE',
        masked_initials: deriveMaskedInitials(user.name),
        train_number: req.body.train_number,
        coach: req.body.coach,
        alert_subtype: req.body.alert_subtype,
        berth: req.body.berth,
        description: req.body.description,
        photo_url: req.body.photo_url,
        audio_url: req.body.audio_url,
      };

      const { data: createdEvent, error: insertError } = await supabase
        .from('safety_events')
        .insert(insertObject)
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({
          error: insertError.message,
          code: 'DATABASE_ERROR'
        });
      }

      return res.status(201).json({
        data: createdEvent,
        message: 'Compartment violation alert logged successfully.'
      });

    } catch (error) {
      console.error('Error logging compartment alert:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * 4. POST /api/safety/hazard-report (protected)
 * Reports a general infrastructure hazard.
 */
router.post(
  '/hazard-report',
  verifyToken,
  [
    body('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat must be a number between -90 and 90'),
    body('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('lng must be a number between -180 and 180'),
    body('alert_subtype')
      .isIn(['UNMANNED_CROSSING', 'BROKEN_PLATFORM', 'POOR_LIGHTING', 'FLOODING', 'TRACK_DAMAGE', 'OTHER'])
      .withMessage('alert_subtype must be one of UNMANNED_CROSSING, BROKEN_PLATFORM, POOR_LIGHTING, FLOODING, TRACK_DAMAGE, OTHER'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('description must be at most 200 characters'),
    body('station_code').optional().isString(),
    body('photo_url').optional().isString(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.user_id)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          error: userError ? userError.message : 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const insertObject = {
        user_id: req.user.user_id,
        event_type: 'HAZARD_REPORT',
        priority: 'MEDIUM',
        status: 'ACTIVE',
        masked_initials: deriveMaskedInitials(user.name),
        lat: req.body.lat,
        lng: req.body.lng,
        alert_subtype: req.body.alert_subtype,
        description: req.body.description,
        station_code: req.body.station_code,
        photo_url: req.body.photo_url,
      };

      const { data: createdEvent, error: insertError } = await supabase
        .from('safety_events')
        .insert(insertObject)
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({
          error: insertError.message,
          code: 'DATABASE_ERROR'
        });
      }

      return res.status(201).json({
        data: createdEvent,
        message: 'Hazard report logged successfully.'
      });

    } catch (error) {
      console.error('Error logging hazard report:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * 5. GET /api/safety/my-events (protected)
 * Retrieves all events reported by the authenticated user.
 */
router.get('/my-events', verifyToken, async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('safety_events')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: error.message,
        code: 'DATABASE_ERROR'
      });
    }

    return res.status(200).json({
      data: events,
      message: 'My events retrieved successfully.'
    });

  } catch (error) {
    console.error('Error fetching my events:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * 6. PATCH /api/safety/events/:id/resolve (protected)
 * Updates the resolution state/notes of a safety event.
 */
router.patch(
  '/events/:id/resolve',
  verifyToken,
  [
    body('status')
      .isIn(['ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'])
      .withMessage('status must be one of ACKNOWLEDGED, RESOLVED, FALSE_ALARM'),
    body('rpf_note').optional().isString(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { data: event, error: fetchError } = await supabase
        .from('safety_events')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !event) {
        return res.status(404).json({
          error: 'Event not found',
          code: 'EVENT_NOT_FOUND'
        });
      }

      if (event.user_id !== req.user.user_id) {
        return res.status(403).json({
          error: 'Access denied: Event does not belong to you',
          code: 'FORBIDDEN'
        });
      }

      const updateData = {
        status: req.body.status,
        rpf_note: req.body.rpf_note !== undefined ? req.body.rpf_note : event.rpf_note,
        updated_at: new Date().toISOString()
      };

      if (req.body.status === 'RESOLVED') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data: updatedEvent, error: updateError } = await supabase
        .from('safety_events')
        .update(updateData)
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          error: updateError.message,
          code: 'DATABASE_ERROR'
        });
      }

      return res.status(200).json({
        data: updatedEvent,
        message: 'Event resolution status updated successfully.'
      });

    } catch (error) {
      console.error('Error resolving event:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

/**
 * 7. GET /api/safety/public/map (NO auth)
 * Public map data endpoint with restricted properties and filters.
 */
router.get('/public/map', async (req, res) => {
  try {
    let query = supabase
      .from('safety_events')
      .select('id, event_type, alert_subtype, lat, lng, status, train_number, station_code, created_at');

    if (req.query.type) {
      query = query.eq('event_type', req.query.type);
    }
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }

    const { data: events, error } = await query;

    if (error) {
      return res.status(500).json({
        error: error.message,
        code: 'DATABASE_ERROR'
      });
    }

    return res.status(200).json({
      data: events,
      message: 'Public map data retrieved successfully.'
    });

  } catch (error) {
    console.error('Error fetching public map data:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * 8. GET /api/safety/rpf/live (NO auth for MVP)
 * Live feed of top 50 safety events for RPF dashboard.
 */
router.get('/rpf/live', async (req, res) => {
  try {
    // TODO: requires RPF officer auth in production
    const { data: events, error } = await supabase
      .from('safety_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({
        error: error.message,
        code: 'DATABASE_ERROR'
      });
    }

    return res.status(200).json({
      data: events,
      message: 'RPF live events retrieved successfully.'
    });

  } catch (error) {
    console.error('Error fetching RPF live events:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

module.exports = router;
