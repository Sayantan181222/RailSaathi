import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjjzzahcqmxksruzfpfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqanp6YWhjcW14a3NydXpmcGZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk3Mzk5OCwiZXhwIjoyMDk2NTQ5OTk4fQ.kcbvAuBzIpcCrKLEs-oWTxOEEk6CB6ATjdIVFcdz_2M';

export const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
