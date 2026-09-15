import { z } from 'zod';

/**
 * Canonical, closed vocabulary of routable specialties.
 * NEVER accept a free-form specialty from the model: an unconstrained string
 * breaks downstream routing (Maps keywords, doctor-directory lookups, analytics).
 */
export const CLINICAL_SPECIALTIES = [
  'Emergency Medicine',
  'General Medicine',
  'Pediatrics',
  'Cardiology',
  'Pulmonology',
  'Gastroenterology',
  'Neurology',
  'Nephrology',
  'Endocrinology',
  'Orthopedics',
  'Rheumatology',
  'Dermatology',
  'Ophthalmology',
  'ENT',
  'Dentistry',
  'Urology',
  'Obstetrics & Gynaecology',
  'Psychiatry',
  'General Surgery',
  'Oncology',
  'Infectious Disease',
  'Physiotherapy',
] as const;

export type ClinicalSpecialty = (typeof CLINICAL_SPECIALTIES)[number];

export const TRIAGE_URGENCY = [
  'EMERGENCY_NOW', // call 108 / go to ED immediately
  'URGENT_24H',
  'ROUTINE_7D',
  'SELF_CARE',
] as const;
export type TriageUrgency = (typeof TRIAGE_URGENCY)[number];

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'bn', 'mr', 'ta', 'te', 'kn', 'ml', 'gu', 'pa', 'or'] as const;

const likelihoodEnum = z.enum(['HIGH', 'MODERATE', 'LOW']);

/**
 * NOTE: we intentionally do NOT use `.strict()`. Gemini occasionally emits
 * additional keys; stripping unknown keys (Zod's default) keeps us resilient,
 * while every field we actually consume stays strongly typed.
 */
export const triageResultSchema = z.object({
  schema_version: z.literal('1.0'),
  language: z.enum(SUPPORTED_LANGUAGES),

  /** Patient-facing, non-diagnostic summary of what was understood. */
  summary: z.string().trim().min(20).max(800),

  /** MANDATORY routing target. Drives <SpecialistRouter />. */
  recommended_specialty: z.enum(CLINICAL_SPECIALTIES),
  /** Ranked fallbacks if the primary specialty is unavailable nearby. */
  alternate_specialties: z.array(z.enum(CLINICAL_SPECIALTIES)).max(2).default([]),
  referral_reason: z.string().trim().min(10).max(400),

  urgency: z.enum(TRIAGE_URGENCY),
  /** Model self-reported confidence; gate auto-routing below your threshold. */
  confidence: z.number().min(0).max(1),

  red_flags: z.array(z.string().trim().min(3).max(200)).max(8).default([]),
  possible_conditions: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(120),
        likelihood: likelihoodEnum,
      }),
    )
    .max(5)
    .default([]),
  suggested_investigations: z.array(z.string().trim().max(160)).max(8).default([]),
  self_care_advice: z.array(z.string().trim().max(240)).max(8).default([]),

  /** Must always be rendered verbatim in the UI. */
  disclaimer: z.string().trim().min(20).max(400),
});

export type TriageResult = z.infer<typeof triageResultSchema>;

/** Convenience guard used by the router UI. */
export function isEmergency(result: Pick<TriageResult, 'urgency'>): boolean {
  return result.urgency === 'EMERGENCY_NOW';
}
