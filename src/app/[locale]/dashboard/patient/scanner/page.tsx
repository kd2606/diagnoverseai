"use client";
import { useTranslations } from "next-intl";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  ScanFace,
  ScanLine,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import {
  ACCENT,
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

/* ------------------------------------------------------------ scan modes */

type ModeId = "face" | "eye" | "skin";

const MODES = [
  {
    id: "face" as ModeId,
    label: "Face",
    icon: ScanFace,
    facingMode: "user" as const,
    hint: "Hold your phone at eye level in even light. Keep a neutral expression.",
    guide: "Align your face inside the frame",
  },
  {
    id: "eye" as ModeId,
    label: "Eye",
    icon: Eye,
    facingMode: "user" as const,
    hint: "Move about 20 cm away and open your eye wide. Avoid direct glare.",
    guide: "Center one open eye in the frame",
  },
  {
    id: "skin" as ModeId,
    label: "Skin",
    icon: Sun,
    facingMode: "environment" as const,
    hint: "Fill the frame with the area of concern. Natural daylight is best.",
    guide: "Fill the frame with the skin area",
  },
];

type Finding = { label: string; confidence: number; note: string };
type Result = { headline: string; severity: "clear" | "watch" | "review"; findings: Finding[] };
type Phase = "idle" | "live" | "captured" | "analyzing" | "result";

/* ------------------------------------------------ image edge-compression */

/**
 * Downscales + re-encodes on-device before upload. Keeps payloads small on
 * 3G/rural connections, which is the whole point of the fallback path.
 */
async function compressToDataUrl(file: File, maxEdge = 1440, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(canvas.width ? bitmap : bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}

import { processVisionScan } from '@/actions/nova-vision';
import type { VisionResult } from '@/actions/nova-vision';
import { markForAdjudication } from '@/actions/adjudication';
import { CLINICAL_MATRIX, type ScanType } from '@/utils/clinicalMatrix';

async function runScan(mode: ModeId, _image: string): Promise<VisionResult> {
  return await processVisionScan(mode, _image);
}

const SEVERITY = {
  clear: { accent: "emerald" as const, label: "LOOKS CLEAR" },
  watch: { accent: "indigo" as const, label: "KEEP WATCHING" },
  review: { accent: "rose" as const, label: "SEE A DOCTOR" },
};

/* ------------------------------------------------------------- reticles */

function Reticles() {
  const corners = [
    "left-5 top-5 border-l border-t rounded-tl-lg",
    "right-5 top-5 border-r border-t rounded-tr-lg",
    "left-5 bottom-5 border-l border-b rounded-bl-lg",
    "right-5 bottom-5 border-r border-b rounded-br-lg",
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {corners.map((c) => (
        <span key={c} className={cn("absolute h-10 w-10 border-white/25", c)} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function UnifiedScannerPage() {
  const t = useTranslations("Scanner");

  const [mode, setMode] = useState<ModeId>("face");
  const [phase, setPhase] = useState<Phase>("idle");
  const [shot, setShot] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  const active = MODES.find((m) => m.id === mode)!;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]); // always release the camera

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: active.facingMode, width: { ideal: 1280 } },
        audio: false,
      });
      stopCamera();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShot(null);
      setResult(null);
      setPhase("live");
    } catch {
      setError("Camera unavailable. You can upload a photo instead.");
      setPhase("idle");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setShot(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
    setPhase("captured");
  };

  const onUpload = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      stopCamera();
      setShot(await compressToDataUrl(file));
      setPhase("captured");
    } catch {
      setError("That image couldn't be read. Try a JPG or PNG.");
    }
  };

  const analyze = async () => {
    if (!shot) return;
    setPhase("analyzing");
    try {
      setResult(await runScan(mode, shot));
      setPhase("result");
    } catch {
      setError("Analysis failed. Please try again.");
      setPhase("captured");
    }
  };

  const reset = () => {
    stopCamera();
    setShot(null);
    setResult(null);
    setError(null);
    setPhase("idle");
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Module 01 · Vision"
        title="Visual Assessment"
        subtitle="One camera for face, eye and skin checks. Pick what you want to scan, then follow the on-screen guide."
        icon={ScanLine}
      />

      {/* ---------------------------------------------- mode switch (3-way) */}
      <div
        role="tablist"
        aria-label="Scan type"
        className={cn("mb-6 grid grid-cols-3 gap-1.5 rounded-2xl p-1.5", glass)}
      >
        {MODES.map((m) => {
          const selected = m.id === mode;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setMode(m.id);
                reset();
              }}
              className="relative flex min-h-[52px] items-center justify-center gap-2 rounded-xl text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              {selected && (
                <motion.span
                  layoutId="scanner-mode"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl border border-white/10 bg-indigo-500/10 shadow-[0_0_30px_-10px_rgba(99,102,241,0.7)]"
                />
              )}
              <m.icon
                className={cn(
                  "relative h-[18px] w-[18px]",
                  selected ? "text-indigo-300" : "text-white/40"
                )}
                strokeWidth={1.75}
              />
              <span className={cn("relative", selected ? "text-white" : "text-white/50")}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        {/* ------------------------------------------------- viewfinder */}
        <SpotlightCard inert className="p-4 sm:p-5">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn(
                "h-full w-full object-cover transition-opacity duration-500",
                phase === "live" ? "opacity-100" : "opacity-0",
                active.facingMode === "user" && "scale-x-[-1]"
              )}
            />

            {shot && (
              <img
                src={shot}
                alt="Captured scan preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            {/* idle placeholder */}
            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <CameraOff className="h-7 w-7 text-white/20" strokeWidth={1.25} />
                <p className="max-w-[16rem] text-sm text-white/35">
                  Camera is off. Start the camera or upload a photo.
                </p>
              </div>
            )}

            {/* scanning laser */}
            <AnimatePresence>
              {phase === "analyzing" && !reduce && (
                <motion.div
                  key="laser"
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <motion.div
                    animate={{ y: ["-18%", "108%"] }}
                    transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-x-0 h-28"
                  >
                    <div className="h-full w-full bg-gradient-to-b from-transparent via-indigo-400/20 to-transparent" />
                    <div className="absolute bottom-0 h-px w-full bg-indigo-300 shadow-[0_0_18px_2px_rgba(129,140,248,0.9)]" />
                  </motion.div>
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.07)_1px,transparent_1px)] bg-[size:100%_28px]" />
                </motion.div>
              )}
            </AnimatePresence>

            <Reticles />

            {/* live guide chip */}
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute inset-x-0 bottom-5 flex justify-center px-6"
              >
                <span
                  className={cn(
                    "rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70",
                    glass
                  )}
                >
                  {phase === "analyzing"
                    ? "Analyzing frame…"
                    : phase === "live"
                    ? active.guide
                    : phase === "captured"
                    ? "Image ready"
                    : `Mode · ${active.label}`}
                </span>
              </motion.div>
            </AnimatePresence>

            {/* status pip */}
            <div className="absolute left-5 top-5">
              {phase === "live" && <Tag accent="rose" dot>{t("live")}</Tag>}
              {phase === "analyzing" && <Tag accent="indigo" dot>{t("scanning")}</Tag>}
              {phase === "result" && <Tag accent="emerald">{t("complete")}</Tag>}
            </div>
          </div>

          {/* ------------------------------------------------- controls */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {phase === "idle" && (
              <>
                <GlowPill icon={Camera} onClick={startCamera}>
                  Start Camera
                </GlowPill>
                <GlowPill
                  variant="ghost"
                  icon={Upload}
                  onClick={() => fileRef.current?.click()}
                >
                  Upload Photo
                </GlowPill>
              </>
            )}

            {phase === "live" && (
              <>
                <GlowPill icon={ScanLine} onClick={capture}>
                  Capture
                </GlowPill>
                <GlowPill variant="ghost" onClick={reset}>
                  Cancel
                </GlowPill>
              </>
            )}

            {phase === "captured" && (
              <>
                <GlowPill icon={Sparkles} onClick={analyze}>
                  Analyze with AI
                </GlowPill>
                <GlowPill variant="ghost" icon={RefreshCw} onClick={reset}>
                  Retake
                </GlowPill>
              </>
            )}

            {phase === "analyzing" && (
              <GlowPill disabled icon={Loader2} className="[&>svg]:animate-spin">
                Analyzing…
              </GlowPill>
            )}

            {phase === "result" && (
              <GlowPill accent="emerald" icon={RefreshCw} onClick={reset}>
                New Scan
              </GlowPill>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />
          </div>

          <p aria-live="polite" className="sr-only">
            {phase}
          </p>
          {error && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-rose-300/80">
              {error}
            </p>
          )}
        </SpotlightCard>

        {/* --------------------------------------------- guidance / result */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <SpotlightCard accent={SEVERITY[result.severity].accent} className="p-6">
                  <Tag accent={SEVERITY[result.severity].accent}>
                    {SEVERITY[result.severity].label}
                  </Tag>
                  <h2 className="mt-4 text-xl font-semibold leading-snug text-white">
                    {result.headline}
                  </h2>

                  <ul className="mt-6 space-y-5">
                    {result.findings.map((f, i) => (
                      <li key={f.label}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-white/75">{f.label}</span>
                          <span className="font-mono text-[11px] text-white/40">
                            {Math.round(f.confidence * 100)}%
                          </span>
                        </div>
                        <div className="mt-2">
                          <Meter
                            value={f.confidence}
                            accent={SEVERITY[result.severity].accent}
                            delay={i * 0.1}
                          />
                        </div>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-white/30">
                          {f.note}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {/* Clinical Next Steps */}
                  <div className="mt-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5">
                    <h3 className="font-mono text-[11px] uppercase tracking-widest text-indigo-300">
                      Clinical Next Steps
                    </h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-indigo-100/90">
                      <strong>Precautions:</strong> {CLINICAL_MATRIX[result.category as ScanType]?.[result.severityLevel]?.precautions || "Maintain standard hygiene."}
                      <br />
                      <strong>Next Steps:</strong> {CLINICAL_MATRIX[result.category as ScanType]?.[result.severityLevel]?.nextSteps || "Follow standard care protocols or seek medical advice if unsure."}
                    </p>
                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={async () => {
                          if (!result.id) return;
                          try {
                            const res = await markForAdjudication(result.id);
                            if (res.success) {
                              alert('Sent to Clinician Command Center.');
                            } else {
                              console.error(res.error);
                              alert('Failed to send to Clinician: ' + res.error);
                            }
                          } catch (err) {
                            console.error(err);
                            alert('Failed to send to Clinician.');
                          }
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                      >
                        Send to Clinician Command Center
                      </button>
                      <a
                        href="https://www.google.com/maps/search/Clinics+near+me"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        Locate Care
                      </a>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-300"
                      strokeWidth={1.75}
                    />
                    <p className="text-[13px] text-white/55">
                      Saved to your Clinical Vault automatically.
                    </p>
                  </div>
                </SpotlightCard>
              </motion.div>
            ) : (
              <motion.div
                key="guide"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <SpotlightCard className="p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    How to get a good scan
                  </p>
                  <p className="mt-4 text-[15px] leading-relaxed text-white/70">
                    {active.hint}
                  </p>
                  <ol className="mt-6 space-y-4">
                    {["Choose your scan type above", "Start the camera or upload a photo", "Hold still — the AI does the rest"].map(
                      (step, i) => (
                        <li key={step} className="flex items-start gap-3">
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] text-indigo-300",
                              ACCENT.indigo.soft
                            )}
                          >
                            {i + 1}
                          </span>
                          <span className="text-[14px] leading-6 text-white/55">{step}</span>
                        </li>
                      )
                    )}
                  </ol>
                </SpotlightCard>
              </motion.div>
            )}
          </AnimatePresence>

          <SpotlightCard className="p-5">
            <ClinicalDisclaimer />
          </SpotlightCard>
        </div>
      </div>
    </PageShell>
  );
}
