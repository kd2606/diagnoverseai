"use client";
import { useTranslations } from "next-intl";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AudioLines,
  CheckCircle2,
  Loader2,
  Mic,
  RefreshCw,
  Square,
  Stethoscope,
  Volume2,
} from "lucide-react";
import {
  ClinicalDisclaimer,
  GlowPill,
  Meter,
  PageHeader,
  PageShell,
  SpotlightCard,
  Tag,
  cn,
  glass,
} from "@/components/patient/ui";

const BARS = 40;
const MAX_SECONDS = 8;

type Phase = "idle" | "recording" | "processing" | "result";
type Triage = {
  label: string;
  severity: "clear" | "watch" | "review";
  confidence: number;
  signals: { name: string; value: string }[];
  advice: string;
};

/* ⇢ REPLACE with POST /api/assessments/cough */
async function runTriage(_clip: Blob): Promise<Triage> {
  await new Promise((r) => setTimeout(r, 2800));
  return {
    label: "Dry, non-productive cough",
    severity: "watch",
    confidence: 0.82,
    signals: [
      { name: "Cough type", value: "DRY" },
      { name: "Wheeze detected", value: "NO" },
      { name: "Breath rate", value: "16 / MIN" },
      { name: "Clip quality", value: "GOOD" },
    ],
    advice:
      "No urgent signs found. Stay hydrated and rescan in 48 hours. If breathing gets harder or a fever starts, contact a doctor.",
  };
}

const SEVERITY = {
  clear: { accent: "emerald" as const, label: "LOW CONCERN" },
  watch: { accent: "indigo" as const, label: "MONITOR" },
  review: { accent: "rose" as const, label: "SEE A DOCTOR" },
};

export default function RespiratoryPage() {
  const t = useTranslations("Respiratory");

  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [triage, setTriage] = useState<Triage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const barsRef = useRef<Array<HTMLDivElement | null>>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const reduce = useReducedMotion();

  /* ------------------------------------------------------------- teardown */
  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    barsRef.current.forEach((el) => el && (el.style.transform = "scaleY(0.06)"));
  }, []);

  useEffect(() => teardown, [teardown]);

  /* --------------------------------------------------------- record start */
  const start = async () => {
    setError(null);
    setTriage(null);
    setSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      ctx.createMediaStreamSource(stream).connect(analyser);

      // Constructed from an ArrayBuffer so it satisfies newer lib.dom typings.
      const spectrum = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      let last = 0;
      const tick = (now: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (now - last < 33) return; // ~30fps is plenty, saves battery
        last = now;
        analyser.getByteFrequencyData(spectrum);
        for (let i = 0; i < BARS; i++) {
          const el = barsRef.current[i];
          if (!el) continue;
          const raw = spectrum[Math.floor((i / BARS) * spectrum.length)] / 255;
          el.style.transform = `scaleY(${Math.max(0.06, raw * 1.25)})`;
        }
      };
      rafRef.current = requestAnimationFrame(tick);

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const clip = new Blob(chunksRef.current, { type: "audio/webm" });
        teardown();
        setPhase("processing");
        try {
          setTriage(await runTriage(clip));
          setPhase("result");
        } catch {
          setError("Analysis failed. Please record again.");
          setPhase("idle");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setPhase("recording");
    } catch {
      setError("Microphone access is needed to analyze your cough.");
      setPhase("idle");
    }
  };

  const stop = () => recorderRef.current?.stop();

  /* auto-stop timer */
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stop();
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const reset = () => {
    teardown();
    setTriage(null);
    setSeconds(0);
    setError(null);
    setPhase("idle");
  };

  const recording = phase === "recording";

  return (
    <PageShell>
      <PageHeader
        eyebrow="Module 02 · Acoustic"
        title="Respiratory Analysis"
        subtitle="Cough twice into your microphone. The AI listens for wheeze, congestion and breathing rate."
        icon={Stethoscope}
        accent="emerald"
      />

      <SpotlightCard accent="emerald" className="overflow-hidden">
        {/* --------------------------------------------------- mic console */}
        <div className="flex flex-col items-center px-6 pb-10 pt-14 sm:pt-16">
          <div className="relative flex h-44 w-44 items-center justify-center">
            {/* pulsing halos — only while live */}
            <AnimatePresence>
              {recording &&
                !reduce &&
                [0, 0.6, 1.2].map((delay) => (
                  <motion.span
                    key={delay}
                    aria-hidden
                    initial={{ opacity: 0.5, scale: 0.75 }}
                    animate={{ opacity: 0, scale: 1.55 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-emerald-400/40"
                  />
                ))}
            </AnimatePresence>

            <motion.div
              aria-hidden
              animate={
                reduce
                  ? {}
                  : recording
                  ? { opacity: [0.45, 0.9, 0.45], scale: [1, 1.08, 1] }
                  : { opacity: [0.2, 0.4, 0.2] }
              }
              transition={{ duration: recording ? 1.6 : 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-4 rounded-full bg-emerald-500/25 blur-2xl"
            />

            <motion.button
              onClick={recording ? stop : phase === "processing" ? undefined : start}
              disabled={phase === "processing"}
              aria-label={recording ? "Stop recording" : "Start recording your cough"}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className={cn(
                "relative flex h-32 w-32 items-center justify-center rounded-full",
                glass,
                "border-white/10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                recording
                  ? "bg-rose-500/10 shadow-[0_0_70px_-12px_rgba(244,63,94,0.75)]"
                  : "bg-emerald-500/10 shadow-[0_0_70px_-14px_rgba(16,185,129,0.75)]",
                phase === "processing" && "opacity-60"
              )}
            >
              {phase === "processing" ? (
                <Loader2 className="h-11 w-11 animate-spin text-emerald-300" strokeWidth={1.25} />
              ) : recording ? (
                <Square className="h-10 w-10 fill-rose-300 text-rose-300" strokeWidth={1.25} />
              ) : (
                <Mic className="h-12 w-12 text-emerald-200" strokeWidth={1.25} />
              )}
            </motion.button>
          </div>

          {/* status line */}
          <div aria-live="polite" className="mt-8 h-14 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex flex-col items-center gap-2"
              >
                {phase === "idle" && (
                  <>
                    <p className="text-[15px] text-white/70">{t("tapMicrophone")}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
                      takes about {MAX_SECONDS} seconds
                    </p>
                  </>
                )}
                {recording && (
                  <>
                    <Tag accent="rose" dot>{t("recording")}</Tag>
                    <p className="font-mono text-[11px] tracking-[0.2em] text-white/45">
                      00:0{Math.min(seconds, MAX_SECONDS)} / 00:0{MAX_SECONDS}
                    </p>
                  </>
                )}
                {phase === "processing" && (
                  <>
                    <Tag accent="emerald" dot>{t("aiTriage")}</Tag>
                    <p className="text-[15px] text-white/70">{t("processingAi")}</p>
                  </>
                )}
                {phase === "result" && (
                  <>
                    <Tag accent="emerald">{t("complete")}</Tag>
                    <p className="text-[15px] text-white/70">{t("analyzed")}</p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* --------------------------------------------- wave visualizer */}
          <div className="mt-2 flex h-28 w-full max-w-2xl items-center justify-center gap-[3px] px-2">
            {Array.from({ length: BARS }).map((_, i) => (
              <motion.div
                key={i}
                ref={(el) => { barsRef.current[i] = el; }}
                animate={
                  recording || reduce
                    ? {}
                    : { scaleY: [0.08, 0.34 + Math.sin(i / 3) * 0.16, 0.08] }
                }
                transition={{
                  duration: 3.4,
                  repeat: Infinity,
                  delay: i * 0.045,
                  ease: "easeInOut",
                }}
                style={{ transform: "scaleY(0.06)", transformOrigin: "center" }}
                className={cn(
                  "h-full w-full max-w-[7px] flex-1 rounded-full",
                  recording
                    ? "bg-gradient-to-t from-emerald-500/40 via-emerald-300 to-emerald-200"
                    : "bg-white/10",
                  "transition-[background] duration-500"
                )}
              />
            ))}
          </div>

          {phase === "result" && (
            <GlowPill accent="emerald" icon={RefreshCw} className="mt-8" onClick={reset}>
              Record Again
            </GlowPill>
          )}

          {error && (
            <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-rose-300/80">
              {error}
            </p>
          )}
        </div>

        {/* -------------------------------------------------------- result */}
        <AnimatePresence>
          {triage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="border-t border-white/[0.05]"
            >
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1fr]">
                <div>
                  <Tag accent={SEVERITY[triage.severity].accent}>
                    {SEVERITY[triage.severity].label}
                  </Tag>
                  <h2 className="mt-4 text-xl font-semibold text-white">{triage.label}</h2>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-white/40">
                      confidence
                    </span>
                    <span className="font-mono text-[11px] text-white/70">
                      {Math.round(triage.confidence * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 max-w-xs">
                    <Meter value={triage.confidence} accent={SEVERITY[triage.severity].accent} />
                  </div>
                  <p className="mt-6 text-[15px] leading-relaxed text-white/60">{triage.advice}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 self-start">
                  {triage.signals.map((s) => (
                    <div key={s.name} className={cn("rounded-2xl p-4", glass)}>
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
                        {s.name}
                      </p>
                      <p className="mt-2 font-mono text-sm text-white">{s.value}</p>
                    </div>
                  ))}
                  <div className="col-span-2 flex items-center gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={1.75} />
                    <p className="text-[13px] text-white/55">{t("syncedVault")}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SpotlightCard>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Volume2, text: "Find a quiet room — background noise lowers accuracy." },
          { icon: Mic, text: "Hold the phone about 20 cm from your mouth." },
          { icon: AudioLines, text: "Two natural coughs work better than one forced one." },
        ].map((tip) => (
          <SpotlightCard key={tip.text} accent="emerald" className="flex gap-3 p-5">
            <tip.icon className="h-4 w-4 shrink-0 text-emerald-300/80" strokeWidth={1.75} />
            <p className="text-[13px] leading-relaxed text-white/50">{tip.text}</p>
          </SpotlightCard>
        ))}
      </div>

      <ClinicalDisclaimer className="mt-8" />
    </PageShell>
  );
}
