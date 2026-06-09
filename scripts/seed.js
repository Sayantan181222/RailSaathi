// seed.js
// Seeds the database with synthetic data for admin dashboard demo day.

const fs = require('fs');
const path = require('path');

// Load environment variables dynamically
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
const { STATIONS, ROUTES, SAFETY_ROUTES, TRAINS, NAMES, ADMINS } = require('./seed-data');

const isMock = !process.env.SUPABASE_URL ||
               process.env.SUPABASE_URL.includes('mockproject.supabase.co') ||
               !process.env.SUPABASE_SERVICE_KEY ||
               process.env.SUPABASE_SERVICE_KEY.includes('mock');

let supabase;

if (isMock) {
  console.log('Running in MOCK mode (mock or missing Supabase credentials)');
  supabase = {
    from: (table) => {
      const getReturnPromise = (data, count = null) => {
        const promise = Promise.resolve({ data, error: null, count });
        promise.limit = () => getReturnPromise(data, count);
        promise.eq = () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          then: (onfulfilled) => onfulfilled({ data: null, error: null })
        });
        promise.single = () => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null });
        promise.maybeSingle = () => Promise.resolve({ data: Array.isArray(data) ? data[0] : null, error: null });
        return promise;
      };

      return {
        select: (query, options) => {
          let countVal = 0;
          if (options && options.count === 'exact') {
            const counts = {
              users: 20, journeys: 30, complaints: 500,
              safety_events: 50, travel_intents: 200,
              tatkal_requests: 10, admin_users: 3
            };
            countVal = counts[table] || 0;
          }
          return getReturnPromise([], countVal);
        },
        insert: (data) => {
          const insertedData = Array.isArray(data)
            ? data.map((d, index) => ({ id: `mock-uuid-${table}-${index}`, ...d }))
            : { id: `mock-uuid-${table}`, ...data };
          const promise = Promise.resolve({ data: insertedData, error: null });
          promise.select = () => Promise.resolve({ data: insertedData, error: null });
          return promise;
        },
        delete: () => ({
          neq: () => Promise.resolve({ data: [], error: null })
        })
      };
    },
    rpc: () => Promise.resolve({ data: null, error: null })
  };
} else {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function ensureTablesExist() {
  // DB tables are defined via schema migrations, skipping creation in seeder.
}

async function seed() {
  try {
    console.log('Ensuring tables are defined...');
    await ensureTablesExist();

    // 1. Seed users (only if empty)
    console.log('Seeding users...');
    const { data: existingUsers } = await supabase.from('users').select('id').limit(1);
    let userIds = [];

    if (!existingUsers || existingUsers.length === 0) {
      const usersToInsert = [{
        phone: '9999999999',
        name: 'Arjun Singh',
        firebase_uid: 'fb_demo_user_uid',
        is_verified: true,
        preferred_class: '3A'
      }];

      for (let i = 0; i < 19; i++) {
        usersToInsert.push({
          phone: `98765432${i < 10 ? '0' + i : i}`,
          name: `${NAMES[i % NAMES.length]} Sharma`,
          firebase_uid: `fb_mock_uid_${i}`,
          is_verified: Math.random() > 0.2,
          preferred_class: ['SL', '3A', '2A', '1A', 'GEN'][Math.floor(Math.random() * 5)]
        });
      }
      const { data: insertedUsers, error } = await supabase.from('users').insert(usersToInsert).select('id');
      if (error) throw error;
      userIds = insertedUsers.map((u) => u.id);
      console.log(`Seeding users... done (${userIds.length} rows)`);
    } else {
      const { data: allUsers } = await supabase.from('users').select('id');
      userIds = allUsers.map((u) => u.id);
      console.log(`Seeding users... done (skipped, already has ${userIds.length} rows)`);
    }

    // Clean up dependent tables for idempotency
    console.log('Cleaning up existing table data for seeding...');
    await supabase.from('journeys').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('complaints').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('safety_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('travel_intents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tatkal_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Seed journeys
    console.log('Seeding journeys...');
    const journeysToInsert = [];
    for (let i = 0; i < 30; i++) {
      const train = TRAINS[i % TRAINS.length];
      const travelDate = new Date();
      travelDate.setDate(travelDate.getDate() + (i % 7));
      journeysToInsert.push({
        user_id: userIds[i % userIds.length],
        pnr: `12345678${i < 10 ? '0' + i : i}`,
        train_number: train.num,
        train_name: train.name,
        boarding_station: train.from,
        destination_station: train.to,
        travel_date: travelDate.toISOString().split('T')[0],
        coach: ['B1', 'B2', 'B3', 'A1', 'S1', 'S2'][Math.floor(Math.random() * 6)],
        berth: String(Math.floor(Math.random() * 72) + 1),
        class: ['3A', '2A', 'SL'][Math.floor(Math.random() * 3)],
        status: ['CONFIRMED', 'RAC', 'WL'][Math.floor(Math.random() * 3)],
        raw_api_response: { seeded: true }
      });
    }
    const { error: journeyErr } = await supabase.from('journeys').insert(journeysToInsert);
    if (journeyErr) throw journeyErr;
    console.log('Seeding journeys... done (30 rows)');

    // 3. Seed complaints
    console.log('Seeding complaints...');
    const complaintsToInsert = [];
    const compTypes = ['Cleanliness', 'Staff Behaviour', 'Food Quality', 'Safety', 'Technical Issue', 'Catering', 'AC Failure', 'Delay'];

    for (let i = 0; i < 500; i++) {
      const station = STATIONS[i % STATIONS.length];
      const type = compTypes[Math.floor(Math.random() * compTypes.length)];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));

      const statusRand = Math.random();
      const status = statusRand < 0.6 ? 'Pending' : (statusRand < 0.85 ? 'Resolved' : 'In-Progress');

      complaintsToInsert.push({
        user_id: userIds[i % userIds.length],
        reference_number: `COMP-${100000 + i}`,
        train_number: `12${Math.floor(Math.random() * 900) + 100}`,
        station_code: station.code,
        station_name: station.name,
        complaint_type: type,
        description: `Synthetic issue report detailing ${type.toLowerCase()} concerns at ${station.name}.`,
        station_lat: station.lat,
        station_lng: station.lng,
        status,
        created_at: date.toISOString()
      });
    }
    for (let j = 0; j < complaintsToInsert.length; j += 100) {
      const chunk = complaintsToInsert.slice(j, j + 100);
      const { error } = await supabase.from('complaints').insert(chunk);
      if (error) throw error;
    }
    console.log('Seeding complaints... done (500 rows)');

    // 4. Seed safety_events
    console.log('Seeding safety_events...');
    const safetyToInsert = [];
    const safetyTypes = ['SOS', 'Harassment', 'Medical', 'Theft', 'Overcrowding'];

    for (let i = 0; i < 50; i++) {
      const route = SAFETY_ROUTES[i % SAFETY_ROUTES.length];
      const type = safetyTypes[Math.floor(Math.random() * safetyTypes.length)];
      const status = i < 5 ? 'ACTIVE' : 'RESOLVED';
      const date = new Date();
      date.setHours(date.getHours() - i);

      const lat = route.latMin + Math.random() * (route.latMax - route.latMin);
      const lng = route.lngMin + Math.random() * (route.lngMax - route.lngMin);

      let event_type = 'SOS';
      let alert_subtype = 'OTHER';
      let priority = 'HIGH';

      if (type === 'SOS') {
        event_type = 'SOS';
        alert_subtype = 'PERSONAL_SAFETY';
        priority = 'CRITICAL';
      } else if (type === 'Harassment') {
        event_type = 'COMPARTMENT_VIOLATION';
        alert_subtype = 'HARASSMENT';
        priority = 'HIGH';
      } else if (type === 'Medical') {
        event_type = 'SOS';
        alert_subtype = 'MEDICAL';
        priority = 'CRITICAL';
      } else if (type === 'Theft') {
        event_type = 'SOS';
        alert_subtype = 'THEFT';
        priority = 'HIGH';
      } else if (type === 'Overcrowding') {
        event_type = 'COMPARTMENT_VIOLATION';
        alert_subtype = 'THREATENING_BEHAVIOUR';
        priority = 'MEDIUM';
      }

      safetyToInsert.push({
        user_id: userIds[i % userIds.length],
        event_type,
        alert_subtype,
        priority,
        train_number: `12${Math.floor(Math.random() * 900) + 100}`,
        coach: `S${Math.floor(Math.random() * 8) + 1}`,
        lat,
        lng,
        description: i < 5 ? 'Emergency SOS alarm triggered.' : `${type} safety event logged.`,
        status,
        created_at: date.toISOString(),
        resolved_at: status === 'RESOLVED' ? new Date().toISOString() : null
      });
    }

    const { error: safetyErr } = await supabase.from('safety_events').insert(safetyToInsert);
    if (safetyErr) throw safetyErr;
    console.log('Seeding safety_events... done (50 rows)');

    // 5. Seed travel_intents
    console.log('Seeding travel_intents...');
    const intentsToInsert = [];
    for (let i = 0; i < 200; i++) {
      const route = ROUTES[i % ROUTES.length];
      const travelDate = new Date();
      travelDate.setDate(travelDate.getDate() + (i % 7));
      intentsToInsert.push({
        user_id: userIds[i % userIds.length],
        from_station: route.origin,
        to_station: route.dest,
        travel_date: travelDate.toISOString().split('T')[0],
        preferred_train: '12951',
        class: ['SL', '3A', '2A', '1A'][Math.floor(Math.random() * 4)],
        crowding_score: parseFloat((Math.random() * 5 + 4).toFixed(1)),
        crowding_label: 'MODERATE',
        is_surge_route: Math.random() < 0.3,
        created_at: new Date().toISOString()
      });
    }
    for (let j = 0; j < intentsToInsert.length; j += 100) {
      const chunk = intentsToInsert.slice(j, j + 100);
      const { error } = await supabase.from('travel_intents').insert(chunk);
      if (error) throw error;
    }
    console.log('Seeding travel_intents... done (200 rows)');

    // 6. Seed tatkal_requests
    console.log('Seeding tatkal_requests...');
    const tatkalToInsert = [];
    for (let i = 0; i < 10; i++) {
      const travelDate = new Date();
      travelDate.setDate(travelDate.getDate() + 2);
      const fireTime = new Date(travelDate);
      fireTime.setDate(fireTime.getDate() - 1);
      fireTime.setHours(10, 0, 0, 0);

      const name = NAMES[i % NAMES.length] + ' Sharma';

      tatkalToInsert.push({
        user_id: userIds[i % userIds.length],
        from_station: 'NDLS',
        to_station: 'MMCT',
        travel_date: travelDate.toISOString().split('T')[0],
        train_number: `12${Math.floor(Math.random() * 90) + 10}1`,
        class: ['SL', '3A', '2A'][Math.floor(Math.random() * 3)],
        passengers: [{ name, age: 25 + i, gender: 'M' }],
        is_urgent: true,
        urgency_reason: 'MEDICAL',
        urgency_score: i < 3 ? 8 + i : 5 + (i % 3),
        scheduled_fire_time: fireTime.toISOString(),
        status: 'PENDING',
        booking_date: new Date().toISOString().split('T')[0]
      });
    }
    const { error: tatkalErr } = await supabase.from('tatkal_requests').insert(tatkalToInsert);
    if (tatkalErr) throw tatkalErr;
    console.log('Seeding tatkal_requests... done (10 rows)');

    // 7. Seed admin_users
    console.log('Seeding admin_users...');
    for (const admin of ADMINS) {
      const { data: existingAdmin } = await supabase.from('admin_users').select('id').eq('email', admin.email).maybeSingle();
      if (!existingAdmin) {
        await supabase.from('admin_users').insert(admin);
      }
    }
    console.log('Seeding admin_users... done (3 rows)');

    console.log('\nSeed complete. Database is ready for demo.');

    // Count statistics
    const counts = {};
    const tables = ['users', 'journeys', 'complaints', 'safety_events', 'travel_intents', 'tatkal_requests', 'admin_users'];
    for (const t of tables) {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
      counts[t] = count || 0;
    }
    console.log('Summary Database Counts:', counts);
  } catch (err) {
    console.error('Seeding process failed:', err);
    process.exit(1);
  }
}

seed();
