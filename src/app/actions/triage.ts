'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

async function createServerClient() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.getAll().find((c: any) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  
  let accessToken = '';
  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie.value);
      accessToken = parsed.access_token;
    } catch {}
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      }
    }
  );
}

export async function approveTriage(insightId: string) {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('ai_insights')
    .update({ status: 'reviewed' })
    .eq('id', insightId);
    
  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}
