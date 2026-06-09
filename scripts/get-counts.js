const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../services/api/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function countTable(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`${tableName}: Error - ${error.message}`);
    } else {
      console.log(`${tableName}: ${count}`);
    }
  } catch (err) {
    console.log(`${tableName}: Unexpected Error - ${err.message || err}`);
  }
}

async function run() {
  const tables = [
    'users',
    'journeys',
    'complaints',
    'complaint_timeline',
    'station_coordinates',
    'safety_events',
    'tatkal_requests',
    'tatkal_surrenders',
    'amenities',
    'travel_intents'
  ];
  console.log('--- Table Row Counts ---');
  for (const t of tables) {
    await countTable(t);
  }
  console.log('------------------------');
}

run();
