'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, PhoneOff, Loader2 } from 'lucide-react';

interface VoiceCallUIProps {
  onClose: () => void;
}

export default function VoiceCallUI({ onClose }: VoiceCallUIProps) {
  const [status, setStatus] = useState<'listening' | 'processing' | 'speaking' | 'error'>('listening');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef('');
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('error');
      setResponse("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const t = event.results[current][0].transcript;
      transcriptRef.current = t;
      setTranscript(t);
    };

    recognition.onspeechend = () => {
      recognition.stop();
    };

    recognition.onend = async () => {
      if (statusRef.current !== 'listening') return; // Prevent multiple calls
      
      const finalTranscript = transcriptRef.current;
      if (finalTranscript.trim().length > 0) {
        await processTranscript(finalTranscript);
      } else {
        // Restart if nothing was captured
        try { recognition.start(); } catch(e){}
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        try { recognition.start(); } catch(e){}
      } else if (event.error !== 'aborted') {
        setStatus('error');
        setResponse("Error capturing audio: " + event.error);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch(e) {}

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processTranscript = async (finalTranscript: string) => {
    setStatus('processing');
    try {
      const res = await fetch('/api/ai/voice-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript, locale: 'en' })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to process voice');
      
      setIsEmergency(data.isEmergency);
      setResponse(data.text);
      setStatus('speaking');

      // Convert base64 to Blob
      const binaryString = window.atob(data.audioBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const objectUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        // Aggressive Garbage Collection
        URL.revokeObjectURL(objectUrl);
        setStatus('listening');
        transcriptRef.current = '';
        setTranscript('');
        setResponse('');
        setIsEmergency(false);
        try {
          recognitionRef.current?.start();
        } catch (e) {}
      };
      
      await audio.play();
      
    } catch (err: any) {
      setStatus('error');
      setResponse(err.message || 'An error occurred.');
    }
  };

  const handleEndCall = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120] flex flex-col items-center justify-between py-12 px-6">
      {/* Top Status */}
      <div className="text-center mt-10">
        <h2 className="text-xl font-medium text-slate-300">
          {status === 'listening' && 'Listening...'}
          {status === 'processing' && 'Analyzing...'}
          {status === 'speaking' && 'DiagnoVerse AI'}
          {status === 'error' && 'Error'}
        </h2>
        {isEmergency && (
           <div className="mt-4 bg-red-600 text-white font-bold px-6 py-2 rounded-full animate-pulse">
             MEDICAL EMERGENCY
           </div>
        )}
      </div>

      {/* Middle Animation / Text */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg">
        {status === 'listening' && (
          <div className="relative flex items-center justify-center w-48 h-48">
            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
            <div className="absolute inset-4 bg-blue-500 rounded-full opacity-40 animate-pulse"></div>
            <div className="relative bg-blue-600 rounded-full p-8 z-10">
              <Mic size={48} className="text-white" />
            </div>
          </div>
        )}
        
        {status === 'processing' && (
          <Loader2 size={64} className="text-blue-500 animate-spin" />
        )}

        {(status === 'speaking' || status === 'error') && (
           <p className="text-center text-3xl font-light text-white leading-relaxed px-4">
             {response}
           </p>
        )}

        {transcript && status === 'listening' && (
           <p className="mt-12 text-center text-xl text-slate-400 italic px-4">
             "{transcript}"
           </p>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="mb-10">
        <button 
          onClick={handleEndCall}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full p-6 shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-transform hover:scale-110 active:scale-95"
        >
          <PhoneOff size={32} />
        </button>
      </div>
    </div>
  );
}
