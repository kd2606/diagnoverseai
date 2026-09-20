import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fixing foreign key constraint...");
  
  // Try to drop the bad constraint and add the correct one.
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql_string: `
      ALTER TABLE triage_cases DROP CONSTRAINT IF EXISTS triage_cases_patient_id_fkey;
      ALTER TABLE triage_cases ADD CONSTRAINT triage_cases_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE CASCADE;
    `
  });
  
  if (dropError) {
    console.error("Failed to alter via RPC. Attempting raw query...", dropError);
    // Since we are not sure if exec_sql exists, we can't easily execute raw SQL.
  } else {
    console.log("Successfully altered constraint!");
  }
}

main();
