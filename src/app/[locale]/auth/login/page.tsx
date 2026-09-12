'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AmbientBackground } from '@/components/AmbientBackground';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Decode JWT role to determine redirect
      const role = data.session.user.app_metadata.role;
      if (role === 'doctor') {
        router.push('/dashboard/doctor');
      } else {
        router.push('/dashboard/patient');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#050505] p-4">
      <AmbientBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-8 bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl shadow-2xl relative"
      >
        <div className="relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Welcome Back</h1>
            <p className="text-white/40 text-[15px] leading-relaxed tracking-tight">Sign in to DiagnoVerse AI</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-light">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-white/60 ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-white/30" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm" 
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-white/60 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-white/30" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="group w-full py-3.5 px-4 mt-6 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white rounded-xl text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(79,70,229,0.25)] transition-all duration-300 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              <span>Sign In</span>
              {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
            </button>
          </form>

          <p className="mt-8 text-center text-white/40 text-[13px]">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
