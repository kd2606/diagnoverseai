'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  HeartPulse,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/firebase/auth/useUser';
import { db } from '@/firebase/clientApp';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type ChatMessage = {
  id?: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: Date;
  type?: 'text' | 'card';
  cardData?: {
    title: string;
    description: string;
    href: string;
    icon: string;
  };
};

const QUICK_REPLIES = [
  '💊 How am I doing?',
  '🤒 Check my symptoms',
  '🏥 Find nearby hospital',
  '📊 My health score',
];

const WELCOME_MESSAGE =
  "👋 Hi! I'm Pulse, your personal health agent.\nI can help you check symptoms, understand your health data, find nearby hospitals, or just answer health questions.\nHow can I help you today?";

const KEYWORD_ROUTES = [
  { keywords: ['symptom', 'symptoms', 'bimaar', 'bimari'], feature: 'Symptom Checker', desc: "Analyze what you're feeling", href: '/en/symptom-checker', icon: '🤒' },
  { keywords: ['skin', 'twacha', 'daane', 'rash'], feature: 'Skin Scan', desc: 'Analyze a skin condition', href: '/en/skin-scan', icon: '🔍' },
  { keywords: ['hospital', 'doctor', 'aspatal', 'clinic'], feature: 'Nearby Hospitals', desc: 'Find closest medical help', href: '/en/nearby-hospitals', icon: '🏥' },
  { keywords: ['reminder', 'yaad', 'dawai', 'pill'], feature: 'Reminders', desc: 'Manage your medical reminders', href: '/en/reminders', icon: '💊' },
  { keywords: ['scheme', 'yojana', 'sarkari', 'govt'], feature: 'Govt Schemes', desc: 'Explore health financial aid', href: '/en/govt-schemes', icon: '📜' },
  { keywords: ['family', 'parivaar', 'member', 'child'], feature: 'Family Profiles', desc: 'Manage dependent profiles', href: '/en/people', icon: '👨‍👩‍👧‍👦' },
];

export function FloatingChat() {
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: WELCOME_MESSAGE, timestamp: new Date(), type: 'text' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [agentContext, setAgentContext] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
        audioPlayerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Fetch user context when chat opens
  useEffect(() => {
    let fallbackTimeout: NodeJS.Timeout;

    const fetchContext = async () => {
      if (!isOpen || !user || agentContext) return;

      const systemMsgId = 'system-fetching';
      setMessages((prev) => [
        ...prev,
        { id: systemMsgId, role: 'system', content: 'Pulse is checking your health data...', timestamp: new Date(), type: 'text' },
      ]);

      fallbackTimeout = setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== systemMsgId));
      }, 3000);

      try {
        const docRef = doc(db, 'users', user.uid, 'agentContext', 'data');
        const docSnap = await getDoc(docRef);

        clearTimeout(fallbackTimeout);

        let data;
        if (!docSnap.exists()) {
          data = {
            lastSeen: serverTimestamp(),
            holisticScore: 78,
            symptomHistory: ['fever', 'headache'],
            lastScan: { type: 'skin', severity: 'high', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            reminders: [{ name: 'BP Medicine', time: '9:00 AM', dueToday: true }],
          };
          await setDoc(docRef, data, { merge: true });
        } else {
          data = docSnap.data();
        }

        setAgentContext(data);

        let proactiveMsg = '';
        if (data.reminders?.some((r: any) => r.dueToday)) {
          const reminder = data.reminders.find((r: any) => r.dueToday);
          proactiveMsg = `💊 Yaad dila doon — aaj ${reminder.name} lena mat bhoolna!`;
        } else if (data.lastScan?.severity === 'high') {
          const scanDate = data.lastScan.date instanceof Timestamp ? data.lastScan.date.toDate() : new Date(data.lastScan.date);
          const diffDays = (Date.now() - scanDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays <= 7) {
            proactiveMsg = `⚠️ Aapka recent ${data.lastScan.type} scan concerning tha. Kya aapne doctor se mila?`;
          } else if (data.holisticScore < 60) {
            proactiveMsg = `📉 Aapka health score ${data.holisticScore} hai jo thoda kam hai. Baat karte hain?`;
          }
        } else if (data.holisticScore < 60) {
          proactiveMsg = `📉 Aapka health score ${data.holisticScore} hai jo thoda kam hai. Baat karte hain?`;
        }

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== systemMsgId);
          if (proactiveMsg) {
            return [...filtered, { role: 'model', content: proactiveMsg, timestamp: new Date(), type: 'text' }];
          }
          return filtered;
        });
      } catch (err) {
        clearTimeout(fallbackTimeout);
        console.error('Failed to fetch agent context', err);
        setMessages((prev) => prev.filter((m) => m.id !== systemMsgId));
      }
    };

    fetchContext();

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [isOpen, user, agentContext]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setIsListening(false);
        setIsLoading(true);

        try {
          const formData = new FormData();
          formData.append('file', audioBlob);

          const response = await fetch('/api/stt', { method: 'POST', body: formData });
          if (!response.ok) throw new Error('STT failed');

          const data = await response.json();
          if (data.transcript) {
            setInput(data.transcript);
            handleSend(data.transcript);
          } else {
            toast.error('Could not understand audio');
          }
        } catch (err) {
          console.error('STT Error:', err);
          toast.error('Voice processing failed');
        } finally {
          setIsLoading(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast.error('Microphone access denied');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const playTTS = async (text: string, msgId: string) => {
    if (isSpeaking === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsSpeaking(null);
      }
      return;
    }

    setIsSpeaking(msgId);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, languageCode: 'hi-IN' }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const data = await response.json();
      if (data.audios?.[0]) {
        const audioSrc = `data:audio/wav;base64,${data.audios[0]}`;
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = audioSrc;
          audioPlayerRef.current.play();
          audioPlayerRef.current.onended = () => setIsSpeaking(null);
        } else {
          const audio = new Audio(audioSrc);
          audioPlayerRef.current = audio;
          audio.play();
          audio.onended = () => setIsSpeaking(null);
        }
      }
    } catch (err) {
      console.error('TTS Error:', err);
      toast.error('Speech playback failed');
      setIsSpeaking(null);
    }
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const checkForActionCards = (text: string) => {
    const lowerText = text.toLowerCase();
    for (const route of KEYWORD_ROUTES) {
      if (route.keywords.some((kw) => lowerText.includes(kw))) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: '',
            type: 'card',
            timestamp: new Date(),
            cardData: { title: route.feature, description: route.desc, href: route.href, icon: route.icon },
          },
        ]);
        break;
      }
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim(), timestamp: new Date(), type: 'text' };
    setInput('');

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      if (updated.length > 20) return updated.slice(updated.length - 20);
      return updated;
    });

    setIsLoading(true);

    try {
      const modelMsgId = Date.now().toString();
      setMessages((prev) => {
        const newMsg: ChatMessage = { id: modelMsgId, role: 'model', content: '', timestamp: new Date(), type: 'text' };
        const updated = [...prev, newMsg];
        if (updated.length > 20) return updated.slice(updated.length - 20);
        return updated;
      });

      const response = await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].filter((m) => m.type !== 'card' && m.role !== 'system').slice(-20),
          userContext: agentContext,
        }),
      });

      if (response.status === 503) {
        const body = await response.json().catch(() => ({}));
        if (body?.error === 'AI_CAPACITY_EXHAUSTED') {
          setIsLoading(false);
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== modelMsgId);
            return [
              ...filtered,
              {
                id: Date.now().toString(),
                role: 'model' as const,
                content: "⚠️ I'm experiencing high demand right now. For urgent symptoms, contact emergency services.\n\n🔄 I'll be ready again shortly.",
                timestamp: new Date(),
                type: 'text' as const,
              },
            ];
          });
          setCooldownSeconds(30);
          return;
        }
      }

      if (!response.ok || !response.body) throw new Error('Network response was not ok');

      setIsLoading(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullAiResponse = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0]?.delta?.content || '';
                if (content) {
                  fullAiResponse += content;
                  setMessages((prev) =>
                    prev.map((msg) => (msg.id === modelMsgId ? { ...msg, content: msg.content + content } : msg))
                  );
                }
              } catch (e) {
                console.warn('Error parsing stream chunk', e);
              }
            }
          }
        }
      }

      checkForActionCards(`${text} ${fullAiResponse}`);
    } catch (error) {
      console.error('Error communicating with Pulse:', error);
      setIsLoading(false);
      setMessages((prev) => {
        const updated = [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'model' as const,
            content: 'Pulse is resting right now 😴 Please try again later.',
            timestamp: new Date(),
            type: 'text' as const,
          },
        ];
        if (updated.length > 20) return updated.slice(updated.length - 20);
        return updated;
      });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCardClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'flex flex-col overflow-hidden bg-[#050505]/85 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(99,102,241,0.3)]',
              'fixed inset-0 w-[100vw] h-[100dvh] sm:static sm:inset-auto sm:h-[580px] sm:w-[380px] sm:rounded-2xl sm:border sm:border-white/[0.08]'
            )}
          >
            {/* Header */}
            <div className="relative shrink-0 p-4">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="relative grid h-10 w-10 place-items-center rounded-full border border-indigo-500/20 bg-indigo-500/10">
                    <Activity className="h-5 w-5 text-indigo-400" />
                    <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-[#050505] bg-emerald-500" />
                    </span>
                  </div>
                  <div className="leading-tight">
                    <h3 className="text-[15px] font-semibold tracking-tight text-white/95">Pulse Health Agent</h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-400/80">Online</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Chat Body */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/[0.05]"
            >
              {messages.map((msg, idx) => {
                if (msg.type === 'card' && msg.cardData) {
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mr-auto max-w-[85%]"
                    >
                      <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/[0.05] p-3 backdrop-blur-xl">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-xl">{msg.cardData.icon}</span>
                          <span className="text-[14px] font-medium text-indigo-100">{msg.cardData.title}</span>
                        </div>
                        <p className="mb-3 text-[13px] leading-relaxed text-white/50">{msg.cardData.description}</p>
                        <button
                          type="button"
                          onClick={() => handleCardClick(msg.cardData!.href)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500/20 py-2 text-[12px] font-semibold tracking-wide text-indigo-200 transition-colors hover:bg-indigo-500/30"
                        >
                          Open <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                if (msg.role === 'system') {
                  return (
                    <div key={idx} className="my-3 flex justify-center">
                      <span className="animate-pulse rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex items-start gap-3 max-w-[88%]', isUser ? 'ml-auto flex-row-reverse' : 'mr-auto')}
                  >
                    {!isUser && (
                      <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04]">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                      </div>
                    )}
                    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap',
                          isUser
                            ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-50 rounded-tr-sm'
                            : 'bg-white/[0.04] border border-white/[0.05] text-white/90 rounded-tl-sm'
                        )}
                      >
                        {msg.content}
                        {!isUser && msg.content && (
                          <button
                            type="button"
                            onClick={() => playTTS(msg.content, idx.toString())}
                            className="mt-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-indigo-300/70 transition-colors hover:text-indigo-300"
                          >
                            {isSpeaking === idx.toString() ? (
                              <><VolumeX className="h-3 w-3" /> Stop</>
                            ) : (
                              <><Volume2 className="h-3 w-3" /> Listen</>
                            )}
                          </button>
                        )}
                      </div>
                      <span className="mt-1.5 px-1 font-mono text-[9.5px] text-white/30">{formatTime(msg.timestamp)}</span>
                    </div>
                  </motion.div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-3 max-w-[85%] mr-auto">
                  <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04]">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-300/50" />
                  </div>
                  <div className="flex h-[38px] items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/[0.05] bg-white/[0.03] px-4">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Replies */}
            <AnimatePresence>
              {messages.filter((m) => m.role !== 'system').length === 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-3"
                >
                  <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                    {QUICK_REPLIES.map((reply, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(reply)}
                        className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium text-white/70 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-indigo-100"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer / Input */}
            <div className="shrink-0 border-t border-white/[0.08] p-3">
              <form onSubmit={onSubmit} className="relative flex items-center gap-2 rounded-full border border-white/10 bg-[#050505] p-1 shadow-inner focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors',
                    isListening ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' : 'bg-transparent text-white/40 hover:bg-white/[0.06] hover:text-white'
                  )}
                  title="Voice Input"
                >
                  {isListening ? (
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                      <MicOff className="relative h-4 w-4" />
                    </span>
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    cooldownSeconds > 0
                      ? `⏳ Retry in ${cooldownSeconds}s...`
                      : isListening
                      ? 'Listening...'
                      : 'Tap to speak or type...'
                  }
                  className="flex-1 bg-transparent px-2 text-[14.5px] text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
                  disabled={isLoading || isListening || cooldownSeconds > 0}
                  autoComplete="off"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || cooldownSeconds > 0}
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all',
                    input.trim() && !isLoading && cooldownSeconds <= 0
                      ? 'bg-indigo-500 text-white shadow-[0_0_15px_-3px_rgba(99,102,241,0.6)] hover:bg-indigo-400'
                      : 'bg-white/[0.04] text-white/20'
                  )}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] transition-colors',
          isOpen
            ? 'border border-white/10 bg-white/[0.08] text-white backdrop-blur-xl'
            : 'border border-indigo-400/30 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)]'
        )}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sparkles className="h-6 w-6 transition-transform group-hover:scale-110" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{ rotate: isOpen ? 0 : -90, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <X className="h-6 w-6 transition-transform group-hover:scale-110" />
        </motion.div>

        {!isOpen && (
          <span className="absolute right-0 top-0 flex h-3 w-3 z-10">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full border border-indigo-600 bg-emerald-500" />
          </span>
        )}
      </motion.button>
    </div>
  );
}
