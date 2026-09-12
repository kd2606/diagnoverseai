'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Upload, FileText, PhoneCall, Loader2, WifiOff, CloudSync } from 'lucide-react';
import { addToQueue, flushQueue, getQueueCount } from '@/lib/offlineQueue';
import VoiceCallUI from '@/components/VoiceCallUI';

export default function PatientDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);

  useEffect(() => {
    const updateQueueCount = async () => {
      try {
        const count = await getQueueCount();
        setPendingSyncCount(count);
      } catch (e) {
        // Ignored
      }
    };

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      updateQueueCount();
    }

    const handleOnline = async () => {
      setIsOffline(false);
      setSuccessMsg("Back online! Syncing pending uploads...");
      await flushQueue();
      await updateQueueCount();
      setSuccessMsg("Sync complete!");
      setTimeout(() => setSuccessMsg(null), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof window !== 'undefined' && navigator.onLine) {
       handleOnline();
    }

    // Polling fallback to keep UI in sync if another tab modifies IDB
    const interval = setInterval(updateQueueCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas not supported"));
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Blob conversion failed"));
          },
          'image/webp',
          0.7
        );
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      };
      
      img.src = objectUrl;
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSuccessMsg(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Not authenticated");
      const userId = session.user.id;

      // 1. Compress image client-side to save bandwidth
      const compressedBlob = await compressImage(file);
      const recordId = crypto.randomUUID();
      const storagePath = `${userId}/${recordId}/scan.webp`;

      if (isOffline || !navigator.onLine) {
        // Offline Flow: Add to IndexedDB
        await addToQueue(recordId, compressedBlob, storagePath, userId, file.name);
        const count = await getQueueCount();
        setPendingSyncCount(count);
        setSuccessMsg("Saved offline. Will sync automatically when connection returns.");
        setFile(null); // Reset file
        setLoading(false);
        return;
      }

      // Online Flow
      // 2. Insert DB record to establish ownership and permissions
      const { error: dbError } = await supabase
        .from('medical_records')
        .insert({
          id: recordId,
          patient_id: userId,
          title: file.name || 'Uploaded Scan',
          document_type: 'xray',
          storage_path: storagePath
        });

      if (dbError) throw new Error("Failed to save database record: " + dbError.message);

      // 3. Upload compressed WebP to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('medical-records')
        .upload(storagePath, compressedBlob, { contentType: 'image/webp' });

      if (uploadError) throw new Error("Failed to upload image: " + uploadError.message);

      // 4. Generate signed URL for Genkit API
      const { data: signedData, error: signError } = await supabase.storage
        .from('medical-records')
        .createSignedUrl(storagePath, 3600);

      if (signError || !signedData) throw new Error("Failed to generate signed URL");

      // 5. Call Genkit AI analysis endpoint
      const res = await fetch('/api/ai/analyze-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: recordId,
          image_url: signedData.signedUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI Analysis failed");

      setResult(data.data);
      setFile(null); // Reset after successful online upload

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-gray-100 p-6 font-sans">
      <header className="mb-8 flex justify-between items-center max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Patient Dashboard
            {isOffline && (
              <span className="flex items-center gap-1 text-xs bg-amber-900/50 text-amber-500 px-3 py-1 rounded-full border border-amber-500/30">
                <WifiOff size={14} /> Offline Mode
              </span>
            )}
            {!isOffline && pendingSyncCount > 0 && (
              <span className="flex items-center gap-1 text-xs bg-blue-900/50 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 animate-pulse">
                <CloudSync size={14} /> Syncing {pendingSyncCount} record(s)...
              </span>
            )}
          </h1>
          <p className="text-gray-400 mt-2">Upload your scans for AI analysis</p>
        </div>
        <button 
          onClick={() => setIsVoiceCallActive(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20">
          <PhoneCall size={20} />
          Voice Assistant (Call Now)
        </button>
      </header>

      {isVoiceCallActive && (
        <VoiceCallUI onClose={() => setIsVoiceCallActive(false)} />
      )}

      <main className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <section className="bg-[#1E293B] rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload size={20} className="text-blue-400" />
              Upload Medical Record
            </div>
            {pendingSyncCount > 0 && (
              <span className="text-sm font-normal text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                {pendingSyncCount} pending upload(s)
              </span>
            )}
          </h2>
          
          <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center bg-[#0f172a] hover:border-blue-500 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                cursor-pointer"
            />
            {file && (
              <p className="mt-4 text-sm text-emerald-400 font-medium truncate">Selected: {file.name}</p>
            )}
          </div>

          <button 
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : isOffline ? (
              'Save Offline (Queue Sync)'
            ) : (
              'Analyze with Genkit AI'
            )}
          </button>

          {successMsg && (
            <div className="mt-4 p-4 bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm flex items-center gap-2">
              <CloudSync size={16} />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}
        </section>

        <section className="bg-[#1E293B] rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <FileText size={20} className="text-purple-400" />
            AI Analysis Results
          </h2>
          
          {!result && !loading && (
            <div className="h-48 flex items-center justify-center text-slate-500 border border-slate-700 border-dashed rounded-lg bg-[#0f172a]">
              {isOffline 
                ? "You are currently offline. Analysis results will be available after syncing." 
                : "No analysis results yet. Upload a scan to begin."}
            </div>
          )}

          {loading && (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-4 bg-[#0f172a] rounded-lg border border-slate-700">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="animate-pulse">
                {isOffline ? "Saving record offline..." : "Gemini 1.5 Flash is analyzing your record..."}
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-400 mb-1 uppercase tracking-wider">Clinical Summary</h3>
                <p className="text-white text-lg leading-relaxed">{result.clinical_summary}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Findings</h3>
                <ul className="space-y-2">
                  {result.findings?.map((finding: string, i: number) => (
                    <li key={i} className="flex gap-2 text-slate-300">
                      <span className="text-blue-400 mt-1">•</span>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Differential Diagnosis</h3>
                <div className="flex flex-wrap gap-2">
                  {result.differential_diagnosis?.map((dx: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-purple-900/40 text-purple-200 border border-purple-500/30 rounded-full text-sm">
                      {dx}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-700">
                <span className="text-slate-400 text-sm">Confidence Score:</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${(result.confidence_score || 0) * 100}%` }}
                  />
                </div>
                <span className="text-emerald-400 font-medium">
                  {Math.round((result.confidence_score || 0) * 100)}%
                </span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
