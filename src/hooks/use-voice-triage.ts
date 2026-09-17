'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const WAVE_BARS = 48;

export type TriageState = 'idle' | 'arming' | 'listening' | 'processing' | 'error';

type RecognitionCtor = new () => any;
declare global {
  interface Window {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  }
}

export function useVoiceTriage(opts: { lang?: string; onFinal?: (t: string) => void } = {}) {
  const { lang = 'en-US', onFinal } = opts;

  const [state, setState] = useState<TriageState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sttSupported, setSttSupported] = useState(true);

  const levelsRef = useRef<Float32Array>(new Float32Array(WAVE_BARS));
  const peakRef = useRef(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  /** Network-error auto-retry state */
  const MAX_NETWORK_RETRIES = 3;
  const RETRY_DELAY_MS = 1500;
  const networkRetryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Buffer to preserve the interim (partial) transcript across reconnects */
  const pendingInterimRef = useRef('');

  useEffect(() => {
    setSttSupported(
      typeof window !== 'undefined' &&
        Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
  }, []);

  const teardown = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    networkRetryCountRef.current = 0;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    levelsRef.current.fill(0);
    peakRef.current = 0;
  }, []);

  useEffect(() => teardown, [teardown]);

  const stop = useCallback(() => {
    teardown();
    setInterim('');
    setState((prev) => (prev === 'error' ? 'error' : 'idle'));
  }, [teardown]);

  const start = useCallback(async () => {
    setError(null);
    setState('arming');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      ctxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const spectrum = new Uint8Array(analyser.frequencyBinCount);
      // Voice energy lives low in the spectrum — only sample the useful third.
      const usable = Math.floor(analyser.frequencyBinCount * 0.36);
      const bucket = Math.max(1, Math.floor(usable / WAVE_BARS));

      const loop = () => {
        analyser.getByteFrequencyData(spectrum);
        const levels = levelsRef.current;
        let peak = 0;
        for (let i = 0; i < WAVE_BARS; i++) {
          let sum = 0;
          for (let j = 0; j < bucket; j++) sum += spectrum[i * bucket + j] ?? 0;
          // Perceptual curve + a touch of taper toward the edges.
          const raw = Math.pow(sum / bucket / 255, 0.68);
          const taper = 0.55 + 0.45 * Math.sin((i / (WAVE_BARS - 1)) * Math.PI);
          const target = Math.min(1, raw * taper * 1.35);
          levels[i] += (target - levels[i]) * 0.34; // temporal smoothing
          peak = Math.max(peak, levels[i]);
        }
        peakRef.current = peak;
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (Ctor) {
        const initRecognition = () => {
          const recognition = new Ctor();
          recognition.lang = lang;
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            // Any successful result means the connection is healthy — reset retry counter.
            networkRetryCountRef.current = 0;

            let finalChunk = '';
            let interimChunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) finalChunk += res[0].transcript;
              else interimChunk += res[0].transcript;
            }
            if (finalChunk) {
              // If we had saved interim text from before a reconnect, prepend it.
              const saved = pendingInterimRef.current;
              pendingInterimRef.current = '';
              setTranscript((prev) => {
                const combined = saved
                  ? `${prev} ${saved} ${finalChunk}`
                  : `${prev} ${finalChunk}`;
                const next = combined.replace(/\s+/g, ' ').trim();
                onFinal?.(next);
                return next;
              });
            }
            setInterim(interimChunk);
            // Keep the latest interim buffered in case we need to survive a reconnect.
            if (interimChunk) pendingInterimRef.current = interimChunk;
          };

          recognition.onerror = (e: any) => {
            if (e.error === 'no-speech' || e.error === 'aborted') return;

            if (e.error === 'network') {
              const attempt = networkRetryCountRef.current + 1;
              if (attempt <= MAX_NETWORK_RETRIES) {
                networkRetryCountRef.current = attempt;
                // Silently retry after a delay — don't surface the error yet.
                retryTimerRef.current = setTimeout(() => {
                  retryTimerRef.current = null;
                  try {
                    const fresh = initRecognition();
                    recognitionRef.current = fresh;
                    fresh.start();
                  } catch {
                    // If even constructing a new instance fails, give up.
                    networkRetryCountRef.current = MAX_NETWORK_RETRIES;
                    setError('network');
                    setState('error');
                  }
                }, RETRY_DELAY_MS);
                return;
              }
              // All retries exhausted — surface the error and reset cleanly.
              pendingInterimRef.current = '';
              setError('network');
              setState('error');
              return;
            }

            // Non-network errors: fail immediately.
            setError(e.error ?? 'recognition-failed');
            setState('error');
          };

          // Guard against the recognition silently ending after a network hiccup.
          // The browser fires `onend` after `onerror`, so if a retry is already
          // scheduled we must NOT touch state — the retry timer will handle it.
          recognition.onend = () => {
            if (retryTimerRef.current !== null) return; // retry pending
            // If we're still supposed to be listening but recognition stopped
            // on its own (e.g. browser timeout), don't leave the UI stuck.
            setState((prev) => (prev === 'listening' ? 'idle' : prev));
          };

          return recognition;
        };

        const recognition = initRecognition();
        recognition.start();
        recognitionRef.current = recognition;
      }

      setState('listening');
    } catch (e) {
      teardown();
      setError(e instanceof Error ? e.message : 'microphone-denied');
      setState('error');
    }
  }, [lang, onFinal, teardown]);

  const toggle = useCallback(() => {
    if (state === 'listening' || state === 'arming') stop();
    else void start();
  }, [state, start, stop]);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  return {
    state, transcript, interim, error, sttSupported,
    levelsRef, peakRef,
    start, stop, toggle, reset,
    isActive: state === 'listening' || state === 'arming',
  };
}
