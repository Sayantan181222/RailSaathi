const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../services/api/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function inspectTable(tableName) {
  console.log(`--- Table: ${tableName} ---`);
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      console.error(`Error querying ${tableName}:`, error.message || error);
      return;
    }
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      console.log('Sample Row:', data[0]);
    } else {
      console.log('Table is empty, trying to get columns via information_schema...');
      // Since it's empty, let's try a query that might fail if column doesn't exist, or query information_schema
      const { data: cols, error: colErr } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', tableName);
      if (colErr) {
        console.log('Could not query information_schema:', colErr.message);
      } else {
        console.log('Columns:', cols.map(c => c.column_name));
      }
    }
  } catch (err) {
    console.error(`Unexpected error inspecting ${tableName}:`, err);
  }
}

async function run() {
  const tables = ['users', 'journeys', 'complaints', 'safety_events', 'travel_intents', 'tatkal_requests', 'admin_users', 'complaint_timeline', 'station_coordinates'];
  for (const table of tables) {
    await inspectTable(table);
  }
}

run();
