"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Maximize2, ScanLine } from "lucide-react";
import { formatBytes, seededRandom } from "@/lib/utils";
import type { Modality } from "@/lib/triage/types";

interface EncodedAsset {
  url: string;
  bytes: number;
  rawBytes: number;
  type: string;
}

/**
 * Renders a synthetic study to an offscreen canvas, then encodes it to WebP
 * via canvas.toBlob() so the panel can report the *actual* compressed size
 * instead of a hardcoded number.
 */
export function ScanCanvas({
  seed,
  modality,
  filename,
  quality,
  width = 768,
  height = 768,
  roi,
}: {
  seed: string;
  modality: Modality;
  filename: string;
  quality: number;
  width?: number;
  height?: number;
  roi?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [asset, setAsset] = useState<EncodedAsset | null>(null);
  const [wl, setWl] = useState(50);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rand = seededRandom(seed);
    const warm = modality === "DERM" || modality === "FUNDUS";

    ctx.fillStyle = "#040406";
    ctx.fillRect(0, 0, width, height);

    // Primary anatomical mass
    const cx = width / 2 + (rand() - 0.5) * 40;
    const cy = height / 2 + (rand() - 0.5) * 40;
    const body = ctx.createRadialGradient(cx, cy, 20, cx, cy, width * 0.52);
    if (warm) {
      body.addColorStop(0, "rgba(226,178,150,0.92)");
      body.addColorStop(0.55, "rgba(150,104,88,0.6)");
      body.addColorStop(1, "rgba(12,8,8,0)");
    } else {
      body.addColorStop(0, "rgba(232,236,245,0.88)");
      body.addColorStop(0.45, "rgba(120,132,150,0.5)");
      body.addColorStop(1, "rgba(6,8,12,0)");
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx, cy, width * 0.38, height * 0.44, rand() * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Structural striations (ribs / vessels / dermoscopic network)
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 26; i += 1) {
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + rand() * 0.07})`;
      ctx.beginPath();
      const y0 = rand() * height;
      ctx.moveTo(0, y0);
      ctx.bezierCurveTo(width * 0.3, y0 + (rand() - 0.5) * 160, width * 0.7, y0 + (rand() - 0.5) * 160, width, rand() * height);
      ctx.stroke();
    }

    // Focal finding
    const lx = cx + (rand() - 0.5) * width * 0.3;
    const ly = cy + (rand() - 0.5) * height * 0.3;
    const lesion = ctx.createRadialGradient(lx, ly, 2, lx, ly, 58);
    lesion.addColorStop(0, warm ? "rgba(64,36,30,0.95)" : "rgba(255,255,255,0.95)");
    lesion.addColorStop(0.6, warm ? "rgba(90,52,44,0.45)" : "rgba(200,214,235,0.35)");
    lesion.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = lesion;
    ctx.beginPath();
    ctx.arc(lx, ly, 58, 0, Math.PI * 2);
    ctx.fill();

    // Acquisition noise
    const grain = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < grain.data.length; i += 4) {
      const n = (rand() - 0.5) * 26;
      grain.data[i] = Math.max(0, Math.min(255, grain.data[i] + n));
      grain.data[i + 1] = Math.max(0, Math.min(255, grain.data[i + 1] + n));
      grain.data[i + 2] = Math.max(0, Math.min(255, grain.data[i + 2] + n));
    }
    ctx.putImageData(grain, 0, 0);

    // Vignette
    const vig = ctx.createRadialGradient(width / 2, height / 2, width * 0.28, width / 2, height / 2, width * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setAsset({
          url: URL.createObjectURL(blob),
          bytes: blob.size,
          rawBytes: width * height * 4,
          type: blob.type,
        });
      },
      "image/webp",
      quality,
    );
  }, [seed, modality, quality, width, height]);

  useEffect(() => () => { if (asset?.url) URL.revokeObjectURL(asset.url); }, [asset?.url]);

  const ratio = asset ? 1 - asset.bytes / asset.rawBytes : 0;

  return (
    <div className="space-y-2.5">
      <div
        ref={shellRef}
        className="group relative aspect-square w-full overflow-hidden rounded-xl border border-white/[0.07] bg-black"
      >
        <canvas ref={canvasRef} className="hidden" aria-hidden />

        {asset ? (
          <motion.img
            src={asset.url}
            alt={`${modality} study for ${seed}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full object-cover"
            style={{ filter: `brightness(${0.6 + wl / 100}) contrast(${0.8 + wl / 90})` }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <motion.span
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              encoding webp…
            </motion.span>
          </div>
        )}

        {/* ROI box on protocol-flagged studies */}
        {roi && asset && (
          <motion.div
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="absolute left-[38%] top-[34%] h-24 w-24 rounded-md border border-rose-400/70 shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_0_28px_-6px_rgba(244,63,94,0.9)]"
          >
            <span className="absolute -top-5 left-0 rounded bg-rose-500/20 px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-rose-200 backdrop-blur">
              ROI · protocol
            </span>
          </motion.div>
        )}

        {/* Scanning line */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 h-16 bg-[linear-gradient(to_bottom,transparent,rgba(99,102,241,0.18),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          animate={{ y: ["-20%", "120%"] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
        />

        {/* Corner reticles */}
        {["left-2 top-2 border-l border-t", "right-2 top-2 border-r border-t", "left-2 bottom-2 border-l border-b", "right-2 bottom-2 border-r border-b"].map((pos) => (
          <span key={pos} aria-hidden className={`absolute h-4 w-4 border-white/25 ${pos}`} />
        ))}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent p-3">
          <p className="min-w-0 truncate font-mono text-[10px] text-white/60">{filename}</p>
          <button
            type="button"
            onClick={() => shellRef.current?.requestFullscreen?.()}
            className="shrink-0 rounded-md border border-white/[0.08] bg-black/50 p-1.5 text-white/60 backdrop-blur transition-colors hover:text-white"
            aria-label="Expand study"
          >
            <Maximize2 className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Window/level + compression telemetry */}
      <div className="flex items-center gap-3">
        <ScanLine className="h-3.5 w-3.5 shrink-0 text-white/30" strokeWidth={1.75} />
        <input
          type="range"
          min={0}
          max={100}
          value={wl}
          onChange={(e) => setWl(Number(e.target.value))}
          aria-label="Window level"
          className="h-1 w-full cursor-ew-resize appearance-none rounded-full bg-white/[0.08] accent-indigo-400 outline-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:shadow-[0_0_12px_2px_rgba(99,102,241,0.7)]"
        />
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/40">W/L {wl}</span>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-white/30">
        {asset ? (
          <>
            {asset.type} · q{Math.round(quality * 100)} · {width}×{height} ·{" "}
            <span className="text-emerald-300/80">{formatBytes(asset.bytes)}</span> from{" "}
            {formatBytes(asset.rawBytes)} RGBA ·{" "}
            <span className="text-emerald-300/80">−{(ratio * 100).toFixed(1)}%</span> client-side
          </>
        ) : (
          "canvas → webp pipeline initialising"
        )}
      </p>
    </div>
  );
}
