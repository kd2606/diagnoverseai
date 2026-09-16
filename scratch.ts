import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: p } = await supabase.from('profiles').select('*').limit(1);
  const { data: rx } = await supabase.from('prescriptions').select('*, prescription_items(*)').limit(1);
  console.log('profiles', p);
  console.log('prescriptions', rx);
}
run();
