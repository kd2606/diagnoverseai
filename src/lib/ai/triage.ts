import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  CLINICAL_SPECIALTIES,
  SUPPORTED_LANGUAGES,
  TRIAGE_URGENCY,
  triageResultSchema,
  type TriageResult,
} from '@/lib/ai/schemas/triage.schema';

export const TRIAGE_MODEL = 'gemini-1.5-pro' as const; // swap to 'gemini-2.5-pro' when migrating

const SYSTEM_INSTRUCTION = `You are a clinical triage assistant for a Pan-India telehealth platform.
You do NOT diagnose and you do NOT prescribe. Your single job is to summarise the complaint,
surface red flags, and route the patient to exactly one medical specialty.
Rules:
- recommended_specialty MUST be one of the allowed enum values, chosen for the MOST LIKELY cause.
- If any red flag suggests a life-threatening condition, set urgency = EMERGENCY_NOW and
  recommended_specialty = "Emergency Medicine".
- Reply in the same language as the patient (language field = ISO code).
- Never name a specific brand-name drug or a dose.
- disclaimer must state that this is not a medical diagnosis and that a registered
  medical practitioner must confirm any care decision.`;

/** Hand-authored Gemini response schema, kept structurally aligned with triageResultSchema. */
const responseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    'schema_version',
    'language',
    'summary',
    'recommended_specialty',
    'alternate_specialties',
    'referral_reason',
    'urgency',
    'confidence',
    'red_flags',
    'possible_conditions',
    'suggested_investigations',
    'self_care_advice',
    'disclaimer',
  ],
  properties: {
    schema_version: { type: Type.STRING, enum: ['1.0'] },
    language: { type: Type.STRING, enum: [...SUPPORTED_LANGUAGES] },
    summary: { type: Type.STRING },
    recommended_specialty: { type: Type.STRING, enum: [...CLINICAL_SPECIALTIES] },
    alternate_specialties: { type: Type.ARRAY, items: { type: Type.STRING, enum: [...CLINICAL_SPECIALTIES] } },
    referral_reason: { type: Type.STRING },
    urgency: { type: Type.STRING, enum: [...TRIAGE_URGENCY] },
    confidence: { type: Type.NUMBER },
    red_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
    possible_conditions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['name', 'likelihood'],
        properties: {
          name: { type: Type.STRING },
          likelihood: { type: Type.STRING, enum: ['HIGH', 'MODERATE', 'LOW'] },
        },
      },
    },
    suggested_investigations: { type: Type.ARRAY, items: { type: Type.STRING } },
    self_care_advice: { type: Type.ARRAY, items: { type: Type.STRING } },
    disclaimer: { type: Type.STRING },
  },
};

export type TriageOutcome =
  | { ok: true; data: TriageResult }
  | { ok: false; reason: 'INVALID_SHAPE' | 'UPSTREAM_ERROR'; detail: string };

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Server-only. Returns a validated TriageResult or a typed failure — never throws on bad model output. */
export async function runTriage(transcript: string): Promise<TriageOutcome> {
  let text: string;
  try {
    const response = await getClient().models.generateContent({
      model: TRIAGE_MODEL,
      contents: transcript,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.2,
      },
    });
    text = response.text ?? '';
  } catch (error) {
    return { ok: false, reason: 'UPSTREAM_ERROR', detail: error instanceof Error ? error.message : 'unknown' };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, reason: 'INVALID_SHAPE', detail: 'Model did not return valid JSON' };
  }

  const validated = triageResultSchema.safeParse(parsedJson);
  if (!validated.success) {
    return { ok: false, reason: 'INVALID_SHAPE', detail: validated.error.issues.map((i) => i.path.join('.')).join(', ') };
  }
  return { ok: true, data: validated.data };
}
