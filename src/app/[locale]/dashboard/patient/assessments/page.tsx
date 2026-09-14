"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  ClipboardList,
  HeartPulse,
  RotateCcw,
  UserRound,
} from "lucide-react";
import {
  ACCENT,
  Accent,
  ClinicalDisclaimer,
  GlowPill,
  PageHeader,
  PageShell,
  SpotlightCard,
  Tag,
  cn,
  glass,
} from "@/components/patient/ui";

/* --------------------------------------------------------------- schema */

type Question =
  | {
      id: string;
      type: "choice";
      label: string;
      help?: string;
      options: { label: string; score: number }[];
    }
  | {
      id: string;
      type: "number";
      label: string;
      help?: string;
      unit: string;
      min: number;
      max: number;
    };

type Step = { title: string; questions: Question[] };

type Assessment = {
  id: string;
  name: string;
  blurb: string;
  minutes: number;
  icon: typeof Brain;
  accent: Accent;
  steps: Step[];
  /** Maps a raw score to a human band. */
  band: (score: number, max: number) => { label: string; accent: Accent; advice: string };
};

const FREQUENCY = [
  { label: "Not at all", score: 0 },
  { label: "A few days", score: 1 },
  { label: "More than half the days", score: 2 },
  { label: "Nearly every day", score: 3 },
];

const YES_NO = [
  { label: "No", score: 0 },
  { label: "Sometimes", score: 1 },
  { label: "Yes", score: 2 },
];

const ASSESSMENTS: Assessment[] = [
  {
    id: "mind",
    name: "Mental Wellness",
    blurb: "Mood, stress and sleep over the last two weeks.",
    minutes: 2,
    icon: Brain,
    accent: "indigo",
    steps: [
      {
        title: "Mood",
        questions: [
          {
            id: "mood_low",
            type: "choice",
            label: "Over the last 2 weeks, how often have you felt down or hopeless?",
            options: FREQUENCY,
          },
          {
            id: "mood_interest",
            type: "choice",
            label: "How often have you had little interest in things you usually enjoy?",
            options: FREQUENCY,
          },
        ],
      },
      {
        title: "Stress",
        questions: [
          {
            id: "stress_worry",
            type: "choice",
            label: "How often have you felt nervous, anxious or on edge?",
            options: FREQUENCY,
          },
          {
            id: "stress_control",
            type: "choice",
            label: "How often have you found it hard to stop worrying?",
            options: FREQUENCY,
          },
        ],
      },
      {
        title: "Rest",
        questions: [
          {
            id: "sleep_quality",
            type: "choice",
            label: "How often has trouble sleeping affected your day?",
            options: FREQUENCY,
          },
          {
            id: "sleep_hours",
            type: "number",
            label: "On an average night, how many hours do you sleep?",
            unit: "hrs",
            min: 0,
            max: 16,
          },
        ],
      },
      {
        title: "Support",
        questions: [
          {
            id: "support",
            type: "choice",
            label: "Do you have someone you can talk to when things get hard?",
            help: "There is no wrong answer here.",
            options: [
              { label: "Yes, always", score: 0 },
              { label: "Sometimes", score: 1 },
              { label: "Rarely", score: 2 },
            ],
          },
        ],
      },
    ],
    band: (score, max) => {
      const pct = score / max;
      if (pct < 0.3)
        return {
          label: "Steady",
          accent: "emerald",
          advice:
            "Your answers suggest you're coping well right now. Keep up your sleep and social routines — they're doing a lot of the work.",
        };
      if (pct < 0.6)
        return {
          label: "Under strain",
          accent: "indigo",
          advice:
            "Several answers point to ongoing stress. Small, consistent steps help: regular sleep, movement, and talking to someone you trust. Consider booking a check-in with a clinician.",
        };
      return {
        label: "Worth talking to someone",
        accent: "rose",
        advice:
          "Your answers suggest you've been carrying a lot lately. This screening can't assess anything, but it's a good reason to speak with a doctor or mental health professional soon. If you're struggling to get through the day, please reach out to someone you trust or a local support line today.",
      };
    },
  },
  {
    id: "cardio",
    name: "Cardio Wellness",
    blurb: "Heart-health risk factors and daily activity.",
    minutes: 2,
    icon: HeartPulse,
    accent: "rose",
    steps: [
      {
        title: "About you",
        questions: [
          { id: "age", type: "number", label: "How old are you?", unit: "yrs", min: 1, max: 120 },
          {
            id: "bmi",
            type: "number",
            label: "Your BMI, if you know it",
            help: "Leave blank if unsure — it's optional.",
            unit: "kg/m²",
            min: 10,
            max: 60,
          },
        ],
      },
      {
        title: "Vitals",
        questions: [
          {
            id: "bp",
            type: "choice",
            label: "Has a doctor ever told you your blood pressure is high?",
            options: YES_NO,
          },
          {
            id: "cholesterol",
            type: "choice",
            label: "Have you been told your cholesterol is high?",
            options: YES_NO,
          },
        ],
      },
      {
        title: "Lifestyle",
        questions: [
          {
            id: "activity",
            type: "choice",
            label: "How often do you do at least 30 minutes of activity?",
            options: [
              { label: "Most days", score: 0 },
              { label: "A few times a week", score: 1 },
              { label: "Rarely", score: 2 },
            ],
          },
          {
            id: "smoking",
            type: "choice",
            label: "Do you smoke or use tobacco?",
            options: [
              { label: "Never", score: 0 },
              { label: "I quit", score: 1 },
              { label: "Currently", score: 3 },
            ],
          },
        ],
      },
      {
        title: "Symptoms",
        questions: [
          {
            id: "chest",
            type: "choice",
            label: "Do you get chest tightness or breathlessness when active?",
            options: YES_NO,
          },
          {
            id: "family",
            type: "choice",
            label: "Any heart disease in your immediate family?",
            options: YES_NO,
          },
        ],
      },
    ],
    band: (score, max) => {
      const pct = score / max;
      if (pct < 0.25)
        return {
          label: "Low risk profile",
          accent: "emerald",
          advice:
            "Few risk factors showed up. An annual blood pressure check is still worth keeping on the calendar.",
        };
      if (pct < 0.55)
        return {
          label: "Moderate risk profile",
          accent: "indigo",
          advice:
            "Some modifiable factors appeared. Activity, diet and a blood pressure reading at your next visit are the highest-leverage moves.",
        };
      return {
        label: "Elevated risk profile",
        accent: "rose",
        advice:
          "Multiple risk factors showed up together, which matters more than any single one. Please share this summary with a doctor. If you ever get chest pain at rest, seek emergency care immediately.",
      };
    },
  },
];

/* ------------------------------------------------------------ input bits */

function ChoicePills({
  question,
  value,
  onChange,
  accent,
}: {
  question: Extract<Question, { type: "choice" }>;
  value?: number;
  onChange: (score: number) => void;
  accent: Accent;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={question.label}
      className="grid gap-2.5 sm:grid-cols-2"
    >
      {question.options.map((opt) => {
        const selected = value === opt.score;
        return (
          <motion.button
            key={opt.label}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.score)}
            whileTap={{ scale: 0.985 }}
            className={cn(
              "relative flex min-h-[60px] items-center gap-3 rounded-2xl px-5 text-left text-[15px]",
              glass,
              "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/30",
              selected
                ? cn("border-white/15 text-white", ACCENT[accent].soft, ACCENT[accent].glow)
                : "text-white/60 hover:bg-white/[0.045] hover:text-white/85"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                selected ? "border-transparent bg-white/90" : "border-white/20"
              )}
            >
              {selected && <Check className="h-3 w-3 text-[#050505]" strokeWidth={3} />}
            </span>
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function NumberField({
  question,
  value,
  onChange,
}: {
  question: Extract<Question, { type: "number" }>;
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-[64px] items-center gap-4 rounded-2xl px-5",
        glass,
        "focus-within:ring-1 focus-within:ring-indigo-500/50"
      )}
    >
      <input
        type="number"
        inputMode="numeric"
        min={question.min}
        max={question.max}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        placeholder="—"
        className="w-full border-0 bg-transparent text-2xl font-medium text-white outline-none placeholder:text-white/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-white/35">
        {question.unit}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ page */

type Answers = Record<string, number | undefined>;

export default function AssessmentsPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);

  const assessment = ASSESSMENTS.find((a) => a.id === activeId) ?? null;

  const maxScore = useMemo(() => {
    if (!assessment) return 0;
    return assessment.steps
      .flatMap((s) => s.questions)
      .reduce(
        (sum, q) =>
          sum + (q.type === "choice" ? Math.max(...q.options.map((o) => o.score)) : 0),
        0
      );
  }, [assessment]);

  const score = useMemo(
    () =>
      !assessment
        ? 0
        : assessment.steps
            .flatMap((s) => s.questions)
            .filter((q) => q.type === "choice")
            .reduce((sum, q) => sum + (answers[q.id] ?? 0), 0),
    [assessment, answers]
  );

  const step = assessment?.steps[stepIndex];
  const totalSteps = assessment?.steps.length ?? 0;
  const progress = totalSteps ? (stepIndex + (done ? 1 : 0)) / totalSteps : 0;

  /** Choice questions are required; number fields stay optional by design. */
  const canAdvance =
    step?.questions.every(
      (q) => q.type !== "choice" || answers[q.id] !== undefined
    ) ?? false;

  const restart = () => {
    setActiveId(null);
    setStepIndex(0);
    setAnswers({});
    setDone(false);
  };

  /* ------------------------------------------------------------ picker */
  if (!assessment) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Module 03 · Questionnaire"
          title="Health Assessment"
          subtitle="Short, guided check-ins. Answer at your own pace — you can stop and come back anytime."
          icon={ClipboardList}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {ASSESSMENTS.map((a) => (
            <SpotlightCard key={a.id} accent={a.accent} className="p-7">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl",
                  ACCENT[a.accent].soft
                )}
              >
                <a.icon className={cn("h-5 w-5", ACCENT[a.accent].text)} strokeWidth={1.5} />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-white">{a.name}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-white/50">{a.blurb}</p>
              <div className="mt-5 flex items-center gap-2">
                <Tag accent={a.accent}>{a.minutes} min</Tag>
                <Tag accent={a.accent}>{a.steps.length} steps</Tag>
              </div>
              <GlowPill
                accent={a.accent}
                icon={ArrowRight}
                className="mt-7 w-full"
                onClick={() => setActiveId(a.id)}
              >
                Start
              </GlowPill>
            </SpotlightCard>
          ))}
        </div>
        <ClinicalDisclaimer className="mt-8" />
      </PageShell>
    );
  }

  const band = assessment.band(score, maxScore || 1);

  /* ------------------------------------------------------------ wizard */
  return (
    <PageShell>
      <PageHeader
        eyebrow={`Module 03 · ${assessment.name}`}
        title={done ? "Your Summary" : assessment.name}
        subtitle={
          done
            ? "A plain-language read of your answers. Nothing here is a symptom assessment."
            : assessment.blurb
        }
        icon={assessment.icon}
        accent={assessment.accent}
      />

      {/* progress bar */}
      {!done && (
        <div className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              step {stepIndex + 1} / {totalSteps} · {step?.title}
            </p>
            <p className="font-mono text-[10px] text-white/30">
              {Math.round(progress * 100)}%
            </p>
          </div>
          <div className="flex gap-1.5">
            {assessment.steps.map((s, i) => (
              <div
                key={s.title}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
              >
                <motion.div
                  initial={false}
                  animate={{ width: i <= stepIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "h-full rounded-full",
                    assessment.accent === "rose" ? "bg-rose-400" : "bg-indigo-400"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <SpotlightCard accent={assessment.accent} className="p-6 sm:p-9">
        <AnimatePresence mode="wait">
          {!done && step ? (
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-10"
            >
              {step.questions.map((q) => (
                <fieldset key={q.id} className="border-0 p-0">
                  <legend className="mb-1 text-[17px] font-medium leading-snug text-white sm:text-lg">
                    {q.label}
                  </legend>
                  {q.help && (
                    <p className="mb-4 text-[13px] text-white/40">{q.help}</p>
                  )}
                  <div className={q.help ? "" : "mt-4"}>
                    {q.type === "choice" ? (
                      <ChoicePills
                        question={q}
                        value={answers[q.id]}
                        accent={assessment.accent}
                        onChange={(score) =>
                          setAnswers((prev) => ({ ...prev, [q.id]: score }))
                        }
                      />
                    ) : (
                      <NumberField
                        question={q}
                        value={answers[q.id]}
                        onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                      />
                    )}
                  </div>
                </fieldset>
              ))}

              <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] pt-7">
                <GlowPill
                  variant="ghost"
                  icon={ArrowLeft}
                  onClick={() =>
                    stepIndex === 0 ? restart() : setStepIndex((s) => s - 1)
                  }
                >
                  {stepIndex === 0 ? "Exit" : "Back"}
                </GlowPill>
                <GlowPill
                  accent={assessment.accent}
                  icon={ArrowRight}
                  disabled={!canAdvance}
                  onClick={() =>
                    stepIndex + 1 === totalSteps
                      ? setDone(true)
                      : setStepIndex((s) => s + 1)
                  }
                >
                  {stepIndex + 1 === totalSteps ? "See Summary" : "Continue"}
                </GlowPill>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Tag accent={band.accent}>{`result · ${assessment.name}`}</Tag>
              <h2 className="mt-5 text-2xl font-semibold text-white sm:text-3xl">
                {band.label}
              </h2>

              <div className="mt-7 flex items-end gap-3">
                <span className="font-mono text-5xl font-light text-white">{score}</span>
                <span className="pb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">
                  / {maxScore} indicators
                </span>
              </div>
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(score / (maxScore || 1)) * 100}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "h-full rounded-full",
                    band.accent === "emerald"
                      ? "bg-emerald-400"
                      : band.accent === "rose"
                      ? "bg-rose-400"
                      : "bg-indigo-400"
                  )}
                />
              </div>

              <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/65">
                {band.advice}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <GlowPill accent={band.accent} icon={UserRound}>
                  Share with a Clinician
                </GlowPill>
                <GlowPill variant="ghost" icon={RotateCcw} onClick={restart}>
                  Take Another
                </GlowPill>
              </div>

              <p className="mt-8 font-mono text-[10px] leading-relaxed tracking-wide text-white/30">
                THIS IS A WELLNESS SCREENING, NOT A DIAGNOSIS. SCORES ONLY REFLECT
                THE ANSWERS YOU GAVE TODAY.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </SpotlightCard>
    </PageShell>
  );
}
