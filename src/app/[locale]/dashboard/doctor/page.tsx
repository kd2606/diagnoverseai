import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import ReviewModal from '@/components/ReviewModal';

export const dynamic = 'force-dynamic';

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

export default async function DoctorDashboard() {
  const supabase = await createServerClient();
  
  const { data: insights, error } = await supabase
    .from('ai_insights')
    .select(`
      id,
      status,
      confidence_score,
      generated_at,
      raw_analysis_json,
      clinical_summary,
      medical_records!inner (
        storage_path,
        profiles!inner (
          full_name
        )
      )
    `)
    .eq('status', 'pending')
    .order('generated_at', { ascending: false });

  if (error) {
    console.error("Failed to fetch pending triage queue", error);
  }

  const queue = insights || [];

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-end border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">Triage Queue</h1>
            <p className="text-neutral-400 font-light">Pending AI reviews requiring clinical approval.</p>
          </div>
          <div className="text-sm text-neutral-500 font-medium tracking-wide uppercase">
            {queue.length} Pending
          </div>
        </header>

        {queue.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl">
            <p className="text-neutral-500 text-lg font-light">No pending records to review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queue.map((insight: any) => {
              const patientName = insight.medical_records?.profiles?.full_name || 'Unknown Patient';
              const storagePath = insight.medical_records?.storage_path;
              const confidence = insight.confidence_score * 100;
              const colorClass = confidence > 85 ? 'text-emerald-400 bg-emerald-400/10' : 
                                 confidence > 60 ? 'text-amber-400 bg-amber-400/10' : 
                                 'text-red-400 bg-red-400/10';

              return (
                <div key={insight.id} className="group relative bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-medium text-white tracking-wide">{patientName}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                        {Math.round(confidence)}% Confidence
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-8">
                      <p className="text-sm text-neutral-400 line-clamp-3 leading-relaxed">
                        <span className="text-neutral-300 font-medium block mb-1">AI Summary:</span>
                        {insight.clinical_summary}
                      </p>
                    </div>
                  </div>

                  <ReviewModal insight={insight} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
