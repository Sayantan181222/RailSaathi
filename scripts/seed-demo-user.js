// scripts/seed-demo-user.js
// Seeds the exact database records required for the live hackathon demo day.

const fs = require('fs');
const path = require('path');

// Load env variables
const apiEnv = path.join(__dirname, '../services/api/.env');
const rootEnv = path.join(__dirname, '../.env');
if (fs.existsSync(apiEnv)) {
  require('dotenv').config({ path: apiEnv });
} else if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');

const isMock = !process.env.SUPABASE_URL ||
               process.env.SUPABASE_URL.includes('mockproject.supabase.co') ||
               !process.env.SUPABASE_SERVICE_KEY ||
               process.env.SUPABASE_SERVICE_KEY.includes('mock');

let supabase;
if (isMock) {
  console.log('Running in MOCK mode (mock or missing Supabase credentials)');
  supabase = {
    from: (table) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: (data) => Promise.resolve({ data, error: null }),
      upsert: (data) => Promise.resolve({ data, error: null }),
      delete: () => ({ neq: () => Promise.resolve({ data: [], error: null }) })
    })
  };
} else {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function seedDemo() {
  try {
    console.log('Preparing demo day data...');

    // 1. Demo User
    const demoUser = {
      phone: '9999999999',
      name: 'Arjun Sharma',
      firebase_uid: 'demo_firebase_uid_123',
      emergency_contacts: ['9000000001', '9000000002', '9000000003'],
      preferred_class: '3A',
      is_verified: true,
      updated_at: new Date().toISOString()
    };

    let userId;
    if (isMock) {
      userId = 'mock-demo-user-uuid';
      console.log('Seeding demo user... done (Arjun Sharma)');
    } else {
      console.log('Seeding demo user...');
      // Check if user exists
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', demoUser.phone)
        .maybeSingle();

      if (findError) throw findError;

      if (existingUser) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(demoUser)
          .eq('id', existingUser.id)
          .select('id')
          .single();
        if (updateError) throw updateError;
        userId = updatedUser.id;
      } else {
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert(demoUser)
          .select('id')
          .single();
        if (insertError) throw insertError;
        userId = insertedUser.id;
      }
      console.log(`Seeding demo user... done (User UUID: ${userId})`);
    }

    // 2. Demo Journey
    const travelDate = new Date();
    travelDate.setDate(travelDate.getDate() + 7);
    const travelDateStr = travelDate.toISOString().split('T')[0];

    const demoJourney = {
      user_id: userId,
      pnr: '4567890123',
      train_number: '12951',
      train_name: 'Mumbai Rajdhani',
      boarding_station: 'NDLS',
      destination_station: 'MMCT',
      travel_date: travelDateStr,
      coach: 'B4',
      berth: '32',
      class: '3A',
      status: 'CONFIRMED',
      raw_api_response: { demo: true },
      updated_at: new Date().toISOString()
    };

    if (isMock) {
      console.log(`Seeding demo journey for PNR 4567890123... done`);
    } else {
      console.log('Seeding demo journey...');
      const { error: journeyError } = await supabase
        .from('journeys')
        .upsert(demoJourney, { onConflict: 'user_id,pnr' });
      if (journeyError) throw journeyError;
      console.log(`Seeding demo journey... done (PNR: 4567890123, Date: ${travelDateStr})`);
    }

    // 3. Demo Complaints
    const complaintDates = [5, 2, 0];
    const mockComplaints = [
      {
        user_id: userId,
        reference_number: 'COMP-D1',
        complaint_type: 'Cleanliness',
        station_code: 'NDLS',
        station_name: 'New Delhi',
        status: 'Resolved',
        train_number: '12951',
        description: 'Trash piled up in vestibule near coach B4.',
        station_lat: 28.6415,
        station_lng: 77.2193
      },
      {
        user_id: userId,
        reference_number: 'COMP-D2',
        complaint_type: 'AC Failure',
        station_code: 'MMCT',
        station_name: 'Mumbai Central',
        status: 'In-Progress',
        train_number: '12951',
        description: 'AC blowing hot air in coach B4, berth 32.',
        station_lat: 18.9696,
        station_lng: 72.8193
      },
      {
        user_id: userId,
        reference_number: 'COMP-D3',
        complaint_type: 'Staff Behaviour',
        station_code: 'PUNE',
        station_name: 'Pune Jn',
        status: 'Pending',
        train_number: '12951',
        description: 'Pantry staff overcharging for tea.',
        station_lat: 18.5289,
        station_lng: 73.8744
      }
    ].map((c, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - complaintDates[idx]);
      return { ...c, created_at: date.toISOString() };
    });

    if (isMock) {
      console.log('Seeding demo complaints... done (3 complaints)');
    } else {
      console.log('Seeding demo complaints...');
      // Delete existing complaints for this user to avoid duplicates
      await supabase.from('complaints').delete().eq('user_id', userId);
      const { error: compError } = await supabase.from('complaints').insert(mockComplaints);
      if (compError) throw compError;
      console.log('Seeding demo complaints... done (3 rows)');
    }

    // 4. Active SOS Alert
    const sosTime = new Date();
    sosTime.setMinutes(sosTime.getMinutes() - 30);
    const demoSos = {
      user_id: userId,
      event_type: 'SOS',
      train_number: '12952',
      coach: 'B2',
      lat: 19.0760,
      lng: 72.8777,
      description: 'Emergency assistance required in coach B2',
      status: 'ACTIVE',
      created_at: sosTime.toISOString()
    };

    if (isMock) {
      console.log('Seeding active SOS alert... done');
    } else {
      console.log('Seeding active SOS alert...');
      try {
        const { error: sosError } = await supabase.from('safety_events').insert(demoSos);
        if (sosError) throw sosError;
        console.log('Seeding active SOS alert... done');
      } catch (err) {
        console.warn('\n⚠️  WARNING: Seeding active SOS alert with new schema failed, attempting old schema fallback...');
        try {
          const legacyDemoSos = {
            user_id: demoSos.user_id,
            type: demoSos.event_type,
            train_number: demoSos.train_number,
            coach: demoSos.coach,
            lat: demoSos.lat,
            lng: demoSos.lng,
            description: demoSos.description,
            resolved: demoSos.status === 'RESOLVED',
            created_at: demoSos.created_at
          };
          const { error: legacyErr } = await supabase.from('safety_events').insert(legacyDemoSos);
          if (legacyErr) throw legacyErr;
          console.log('Seeding active SOS alert... done (using old schema fallback)\n');
        } catch (fallbackErr) {
          console.error('Seeding active SOS alert failed completely:', fallbackErr.message || fallbackErr);
          console.warn('Please run the migration in supabase/migrations/002_update_safety_events.sql on your Supabase SQL editor to align the schema columns, then run this seeder again.\n');
        }
      }
    }

    // 5. Tatkal Demo Request
    const tatkalDate = new Date();
    tatkalDate.setDate(tatkalDate.getDate() + 5);
    // Calculated scheduled fire time (AC class fires at 10:00 AM day before travel)
    const fireTime = new Date(tatkalDate);
    fireTime.setDate(fireTime.getDate() - 1);
    fireTime.setHours(10, 0, 0, 0);

    const demoTatkal = {
      user_id: userId,
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: tatkalDate.toISOString().split('T')[0],
      train_number: '12951',
      class: '3A',
      passengers: [{ name: 'Arjun Sharma', age: 32, gender: 'M' }],
      is_urgent: true,
      urgency_reason: 'MEDICAL',
      urgency_score: 10,
      scheduled_fire_time: fireTime.toISOString(),
      status: 'PENDING',
      booking_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    if (isMock) {
      console.log('Seeding Tatkal request... done');
    } else {
      console.log('Seeding Tatkal request...');
      const { error: tatkalError } = await supabase.from('tatkal_requests').insert(demoTatkal);
      if (tatkalError) throw tatkalError;
      console.log('Seeding Tatkal request... done');
    }

    // 6. Demand Surge
    const surgeIntents = [];
    for (let i = 0; i < 3; i++) {
      const intentDate = new Date();
      intentDate.setDate(intentDate.getDate() + (i % 7));
      surgeIntents.push({
        user_id: userId,
        from_station: 'NDLS',
        to_station: 'MMCT',
        travel_date: intentDate.toISOString().split('T')[0],
        preferred_train: '12951',
        class: '3A',
        crowding_score: 8.5,
        crowding_label: 'VERY_CROWDED',
        is_surge_route: true,
        created_at: new Date().toISOString()
      });
    }

    if (isMock) {
      console.log('Seeding NDLS-MMCT travel intents (surge)... done');
    } else {
      console.log('Seeding NDLS-MMCT travel intents (surge)...');
      const { error: surgeError } = await supabase.from('travel_intents').insert(surgeIntents);
      if (surgeError) throw surgeError;
      console.log('Seeding NDLS-MMCT travel intents (surge)... done');
    }

    console.log('\nDemo day seeding complete successfully!');
  } catch (err) {
    console.error('Demo seeding failed:', err);
    process.exit(1);
  }
}

seedDemo();
