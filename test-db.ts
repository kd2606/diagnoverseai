import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching schema...");
  const { data, error } = await supabase.from('triage_cases').select('*').limit(1);

  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log("Columns:", data && data.length > 0 ? Object.keys(data[0]) : "No rows, but query succeeded");
  }
}

main();
