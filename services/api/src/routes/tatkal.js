const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase-client');
const { verifyToken } = require('../middleware/auth');

/**
 * Helper to format date to YYYY-MM-DD
 */
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * POST /api/tatkal/prefill
 * Protected. Pre-fills a Tatkal booking assist request.
 */
router.post('/prefill', verifyToken, async (req, res, next) => {
  try {
    const {
      from_station,
      to_station,
      travel_date,
      train_number,
      class: classStr,
      passengers,
      is_urgent,
      urgency_reason,
      urgency_document_url
    } = req.body;

    // 1. Basic validation
    if (!from_station || !to_station || !travel_date || !classStr || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields or passenger list is empty',
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.user_id;
    const today = getTodayDateString();

    // 2. Anti-hoarding: check if user already has an active Tatkal request for today
    const { data: activeRequests, error: checkError } = await supabase
      .from('tatkal_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('booking_date', today)
      .not('status', 'in', '("CANCELLED","FAILED")');

    if (checkError) {
      return next(checkError);
    }

    if (activeRequests && activeRequests.length > 0) {
      return res.status(409).json({
        error: 'You already have an active Tatkal request for today.',
        code: 'HOARDING_LIMIT_EXCEEDED'
      });
    }

    // 3. Fetch user's profile to verify account holder name is in the passengers list
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(400).json({
        error: 'User profile not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const accountHolderName = (user.name || '').toLowerCase().trim();
    if (!accountHolderName) {
      return res.status(400).json({
        error: 'Account profile must contain a name before booking Tatkal.',
        code: 'INCOMPLETE_PROFILE'
      });
    }

    const isAccountHolderIncluded = passengers.some(p => 
      (p.name || '').toLowerCase().trim() === accountHolderName
    );

    if (!isAccountHolderIncluded) {
      return res.status(400).json({
        error: 'Account holder must be included in the passenger list.',
        code: 'ACCOUNT_HOLDER_REQUIRED'
      });
    }

    // 4. Calculate Urgency Score
    let score = 0;
    if (is_urgent) {
      const reasonScores = {
        medical: 9.0,
        bereavement: 8.0,
        official: 7.0,
        personal: 5.0
      };
      score = reasonScores[urgency_reason] || 0.0;
      if (urgency_document_url) {
        score += 1.0;
      }
    }

    // 5. Calculate scheduled_fire_time (travel_date - 1 day at 10:00 AM for AC, 11:00 AM for non-AC)
    const travelDateObj = new Date(travel_date);
    const fireDateObj = new Date(travelDateObj.getTime() - 24 * 60 * 60 * 1000);
    const fireDateStr = fireDateObj.toISOString().split('T')[0];
    const isAC = ['1A', '2A', '3A'].includes(classStr.toUpperCase());
    const fireTime = isAC ? '10:00:00' : '11:00:00';
    const scheduled_fire_time = `${fireDateStr}T${fireTime}+05:30`;

    // 6. Insert request
    const { data: newRequest, error: insertError } = await supabase
      .from('tatkal_requests')
      .insert({
        user_id: userId,
        from_station: from_station.toUpperCase(),
        to_station: to_station.toUpperCase(),
        travel_date,
        train_number: train_number || null,
        class: classStr.toUpperCase(),
        passengers,
        is_urgent: !!is_urgent,
        urgency_reason: is_urgent ? urgency_reason : null,
        urgency_document_url: is_urgent ? urgency_document_url : null,
        urgency_score: score,
        scheduled_fire_time,
        booking_date: today,
        status: 'PENDING'
      })
      .select()
      .single();

    if (insertError) {
      return next(insertError);
    }

    return res.status(201).json({
      data: newRequest,
      message: 'Tatkal request pre-filled successfully'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/tatkal/my-requests
 * Protected. Returns all requests for the logged-in user.
 */
router.get('/my-requests', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { data: requests, error: fetchError } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return next(fetchError);
    }

    return res.status(200).json({
      data: requests,
      message: 'Requests fetched successfully'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/tatkal/:id
 * Protected. Returns a single Tatkal request by ID.
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const { data: request, error: fetchError } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({
        error: 'Request not found',
        code: 'NOT_FOUND'
      });
    }

    if (request.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN'
      });
    }

    return res.status(200).json({
      data: request,
      message: 'Request fetched successfully'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/tatkal/fire/:id
 * Protected. Demo endpoint to simulate firing a Tatkal request.
 */
router.post('/fire/:id', verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Retrieve request
    const { data: request, error: fetchError } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({
        error: 'Request not found',
        code: 'NOT_FOUND'
      });
    }

    if (request.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Only PENDING requests can be fired.',
        code: 'INVALID_STATUS'
      });
    }

    // 1. Update status to FIRED
    const { data: firedRequest, error: updateError1 } = await supabase
      .from('tatkal_requests')
      .update({ status: 'FIRED' })
      .eq('id', id)
      .select()
      .single();

    if (updateError1) {
      return next(updateError1);
    }

    // 2. Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Generate fake PNR and update request to CONFIRMED
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const simulated_pnr = `DEMO${randomDigits}`;
    const fired_at = new Date().toISOString();

    const { data: confirmedRequest, error: updateError2 } = await supabase
      .from('tatkal_requests')
      .update({
        status: 'CONFIRMED',
        simulated_pnr,
        fired_at
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError2) {
      return next(updateError2);
    }

    return res.status(200).json({
      data: confirmedRequest,
      message: 'Tatkal request fired and confirmed successfully'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/tatkal/cancel/:id
 * Protected. Cancels a pending Tatkal request.
 */
router.post('/cancel/:id', verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Retrieve request
    const { data: request, error: fetchError } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({
        error: 'Request not found',
        code: 'NOT_FOUND'
      });
    }

    if (request.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Only PENDING requests can be cancelled.',
        code: 'INVALID_STATUS'
      });
    }

    // Update status to CANCELLED
    const { data: cancelledRequest, error: updateError } = await supabase
      .from('tatkal_requests')
      .update({ status: 'CANCELLED' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return next(updateError);
    }

    return res.status(200).json({
      data: cancelledRequest,
      message: 'Request cancelled successfully'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/tatkal/surrender
 * Protected. Lists a confirmed PNR for surrender.
 */
router.post('/surrender', verifyToken, async (req, res, next) => {
  try {
    const { pnr, from_station, to_station, travel_date, class: classStr, train_number } = req.body;

    if (!pnr || !from_station || !to_station || !travel_date) {
      return res.status(400).json({
        error: 'Missing PNR, route, or travel date',
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.user_id;

    const { data: surrender, error: insertError } = await supabase
      .from('tatkal_surrenders')
      .insert({
        owner_user_id: userId,
        pnr,
        from_station: from_station.toUpperCase(),
        to_station: to_station.toUpperCase(),
        travel_date,
        class: classStr ? classStr.toUpperCase() : null,
        train_number: train_number || null,
        status: 'LISTED'
      })
      .select()
      .single();

    if (insertError) {
      return next(insertError);
    }

    return res.status(201).json({
      data: surrender,
      message: 'Ticket listed for surrender successfully'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/tatkal/surrenders
 * Protected. Returns listed surrenders with filters.
 */
router.get('/surrenders', verifyToken, async (req, res, next) => {
  try {
    let query = supabase
      .from('tatkal_surrenders')
      .select('*')
      .eq('status', 'LISTED');

    const { from, to, date, class: classStr } = req.query;

    if (from) query = query.eq('from_station', from.toUpperCase());
    if (to) query = query.eq('to_station', to.toUpperCase());
    if (date) query = query.eq('travel_date', date);
    if (classStr) query = query.eq('class', classStr.toUpperCase());

    const { data: surrenders, error: fetchError } = await query;

    if (fetchError) {
      return next(fetchError);
    }

    return res.status(200).json({
      data: surrenders,
      message: 'Listed surrenders retrieved successfully'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/tatkal/surrenders/:id/request
 * Protected. Matches a surrender ticket for a requester.
 */
router.post('/surrenders/:id/request', verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Get surrender request
    const { data: surrender, error: fetchError } = await supabase
      .from('tatkal_surrenders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !surrender) {
      return res.status(404).json({
        error: 'Surrender listing not found',
        code: 'NOT_FOUND'
      });
    }

    if (surrender.status !== 'LISTED') {
      return res.status(400).json({
        error: 'This ticket is no longer available.',
        code: 'INVALID_STATUS'
      });
    }

    if (surrender.owner_user_id === userId) {
      return res.status(400).json({
        error: 'You cannot request your own listed ticket.',
        code: 'INVALID_OPERATION'
      });
    }

    // Update status to MATCHED and bind requester
    const { data: matchedSurrender, error: updateError } = await supabase
      .from('tatkal_surrenders')
      .update({
        status: 'MATCHED',
        requester_user_id: userId,
        matched_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return next(updateError);
    }

    return res.status(200).json({
      data: matchedSurrender,
      message: 'Surrender ticket requested and matched successfully'
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
