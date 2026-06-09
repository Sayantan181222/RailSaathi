const fs = require('fs');
const path = require('path');

// Load environment variables dynamically
const apiEnv = path.join(__dirname, '../services/api/.env');
if (fs.existsSync(apiEnv)) {
  require('dotenv').config({ path: apiEnv });
} else {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');

// Parse environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required.");
  process.exit(1);
}

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Reference data
const STATIONS = [
  { code: 'NDLS', lat: 28.6419, lng: 77.2194 },
  { code: 'CSTM', lat: 18.9401, lng: 72.8352 },
  { code: 'HWH', lat: 22.5839, lng: 88.3425 },
  { code: 'MAS', lat: 13.0839, lng: 80.2752 },
  { code: 'BCT', lat: 18.9694, lng: 72.8194 },
  { code: 'LKO', lat: 26.8500, lng: 80.9200 },
  { code: 'PUNE', lat: 18.5300, lng: 73.8600 },
  { code: 'AMD', lat: 23.0225, lng: 72.5714 },
  { code: 'SBC', lat: 12.9762, lng: 77.5712 },
  { code: 'JP', lat: 26.9200, lng: 75.7900 },
  { code: 'BPL', lat: 23.2732, lng: 77.4066 },
  { code: 'VSKP', lat: 17.7325, lng: 83.3152 },
  { code: 'PAT', lat: 25.5922, lng: 85.1341 },
  { code: 'GHY', lat: 26.1445, lng: 91.7362 },
  { code: 'BBS', lat: 20.2961, lng: 85.8201 }
];

const SOS_SUBTYPES = ['PERSONAL_SAFETY', 'MEDICAL', 'THEFT', 'OTHER'];
const COMPARTMENT_SUBTYPES = ['MALE_OCCUPANT', 'HARASSMENT', 'THREATENING_BEHAVIOUR'];
const HAZARD_SUBTYPES = ['BROKEN_PLATFORM', 'POOR_LIGHTING', 'FLOODING', 'TRACK_DAMAGE', 'OTHER'];
const INITIALS = ['R.K.', 'A.S.', 'V.M.', 'S.P.', 'M.D.', 'J.V.', 'P.K.'];

// Helper functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateTrainData = () => {
  const isSleeper = Math.random() > 0.5;
  return {
    train_number: String(randomInt(10000, 29999)),
    coach: isSleeper ? `S${randomInt(1, 12)}` : `B${randomInt(1, 8)}`,
    berth: String(randomInt(1, 72))
  };
};

const generateDate = () => {
  const daysAgo = randomInt(0, 90);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return date.toISOString();
};

async function seed() {
  console.log("Starting RailSaathi safety events seed...");

  // 1. Fetch valid user_id to satisfy foreign key constraints
  let { data: users, error: userFetchError } = await supabase.from('users').select('id').limit(10);
  
  if (userFetchError || !users || users.length === 0) {
    console.warn("⚠️ No users found in DB. Creating a dummy user to satisfy foreign keys...");
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({})
      .select('id')
      .single();
      
    if (createError) {
      console.error("CRITICAL: Failed to fetch or create a user. The seed will fail due to FK restrictions.", createError.message);
      process.exit(1);
    }
    users = [newUser];
  }

  const events = [];

  // 2. Generate SOS Events (30 events: 5 ACTIVE, 10 ACKNOWLEDGED, 15 RESOLVED)
  const sosStatuses = [
    ...Array(5).fill('ACTIVE'),
    ...Array(10).fill('ACKNOWLEDGED'),
    ...Array(15).fill('RESOLVED')
  ];
  
  for (let i = 0; i < 30; i++) {
    const st = pickRandom(STATIONS);
    const tr = generateTrainData();
    const created = generateDate();
    events.push({
      user_id: pickRandom(users).id,
      event_type: 'SOS',
      priority: 'CRITICAL',
      status: sosStatuses[i],
      alert_subtype: pickRandom(SOS_SUBTYPES),
      lat: st.lat + (Math.random() * 0.02 - 0.01),
      lng: st.lng + (Math.random() * 0.02 - 0.01),
      station_code: st.code,
      train_number: tr.train_number,
      coach: tr.coach,
      berth: tr.berth,
      masked_initials: pickRandom(INITIALS),
      created_at: created,
      updated_at: created,
      resolved_at: sosStatuses[i] === 'RESOLVED' ? new Date().toISOString() : null,
      sms_sent: true,
      sms_contacts_count: randomInt(1, 3)
    });
  }

  // 3. Generate COMPARTMENT_VIOLATION Events (20 events)
  const compartmentStatuses = [
    ...Array(5).fill('ACTIVE'),
    ...Array(5).fill('ACKNOWLEDGED'),
    ...Array(10).fill('RESOLVED')
  ];

  for (let i = 0; i < 20; i++) {
    const st = pickRandom(STATIONS);
    const tr = generateTrainData();
    const created = generateDate();
    events.push({
      user_id: pickRandom(users).id,
      event_type: 'COMPARTMENT_VIOLATION',
      priority: 'HIGH',
      status: compartmentStatuses[i],
      alert_subtype: pickRandom(COMPARTMENT_SUBTYPES),
      lat: st.lat + (Math.random() * 0.02 - 0.01),
      lng: st.lng + (Math.random() * 0.02 - 0.01),
      station_code: st.code,
      train_number: tr.train_number,
      coach: tr.coach,
      berth: tr.berth,
      masked_initials: pickRandom(INITIALS),
      created_at: created,
      updated_at: created,
      resolved_at: compartmentStatuses[i] === 'RESOLVED' ? new Date().toISOString() : null,
    });
  }

  // 4. Generate HAZARD_REPORT Events (50 events)
  // 30 UNMANNED_CROSSING, 20 random other types
  const hazardStatuses = [
    ...Array(10).fill('ACTIVE'),
    ...Array(10).fill('ACKNOWLEDGED'),
    ...Array(30).fill('RESOLVED')
  ];

  for (let i = 0; i < 50; i++) {
    const st = pickRandom(STATIONS);
    const isUnmanned = i < 30;
    const created = generateDate();
    
    events.push({
      user_id: pickRandom(users).id,
      event_type: 'HAZARD_REPORT',
      priority: 'MEDIUM',
      status: hazardStatuses[i],
      alert_subtype: isUnmanned ? 'UNMANNED_CROSSING' : pickRandom(HAZARD_SUBTYPES),
      lat: st.lat + (Math.random() * 0.04 - 0.02),
      lng: st.lng + (Math.random() * 0.04 - 0.02),
      station_code: st.code,
      description: isUnmanned ? 'No barrier present at railway crossing.' : 'Found hazard nearby.',
      masked_initials: pickRandom(INITIALS),
      created_at: created,
      updated_at: created,
      resolved_at: hazardStatuses[i] === 'RESOLVED' ? new Date().toISOString() : null,
    });
  }

  // 5. Bulk Insert
  // Supabase limits bulk insert sizes, but 100 rows is perfectly safe.
  const { data, error } = await supabase
    .from('safety_events')
    .insert(events)
    .select('id');

  if (error) {
    console.error("Failed to insert seed data:", error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${data.length} safety events!`);
  process.exit(0);
}

seed();
