'use server';

import { GoogleGenAI, Type } from '@google/genai';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const MODEL_ID = process.env.NOVA_GEMINI_MODEL ?? 'gemini-1.5-flash-8b';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  return new GoogleGenAI({ apiKey });
}

export type ScanCategory = 'LESION_MOLE' | 'RASH_INFLAMMATION' | 'FACE' | 'EYE' | 'UNKNOWN';
export type ScanMode = 'face' | 'eye' | 'skin';

const skinClassifierSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ['LESION_MOLE', 'RASH_INFLAMMATION', 'UNKNOWN']
    }
  },
  required: ['category']
};

const lesionSchema = {
  type: Type.OBJECT,
  properties: {
    icd10Category: { type: Type.STRING },
    severityLevel: { type: Type.INTEGER, description: '1, 2, or 3' },
    headline: { type: Type.STRING, description: 'Clinical summary headline' },
    borderIrregularity: { type: Type.NUMBER, description: 'Score 0 to 1' },
    borderNote: { type: Type.STRING },
    pigmentVariation: { type: Type.NUMBER, description: 'Score 0 to 1' },
    pigmentNote: { type: Type.STRING },
    surfaceTexture: { type: Type.NUMBER, description: 'Score 0 to 1' },
    surfaceNote: { type: Type.STRING }
  },
  required: ['icd10Category', 'severityLevel', 'headline', 'borderIrregularity', 'borderNote', 'pigmentVariation', 'pigmentNote', 'surfaceTexture', 'surfaceNote']
};

const rashSchema = {
  type: Type.OBJECT,
  properties: {
    icd10Category: { type: Type.STRING },
    severityLevel: { type: Type.INTEGER, description: '1, 2, or 3' },
    headline: { type: Type.STRING, description: 'Clinical summary headline' },
    erythemaIntensity: { type: Type.NUMBER, description: 'Score 0 to 1' },
    erythemaNote: { type: Type.STRING },
    scalingFlaking: { type: Type.NUMBER, description: 'Score 0 to 1' },
    scalingNote: { type: Type.STRING },
    surfaceArea: { type: Type.NUMBER, description: 'Score 0 to 1' },
    surfaceAreaNote: { type: Type.STRING }
  },
  required: ['icd10Category', 'severityLevel', 'headline', 'erythemaIntensity', 'erythemaNote', 'scalingFlaking', 'scalingNote', 'surfaceArea', 'surfaceAreaNote']
};

const faceSchema = {
  type: Type.OBJECT,
  properties: {
    icd10Category: { type: Type.STRING },
    severityLevel: { type: Type.INTEGER, description: '1, 2, or 3' },
    headline: { type: Type.STRING, description: 'Clinical summary headline' },
    symmetryIndex: { type: Type.NUMBER, description: 'Score 0 to 1' },
    symmetryNote: { type: Type.STRING },
    pallorMarkers: { type: Type.NUMBER, description: 'Score 0 to 1' },
    pallorNote: { type: Type.STRING },
    periorbitalSwelling: { type: Type.NUMBER, description: 'Score 0 to 1' },
    periorbitalNote: { type: Type.STRING }
  },
  required: ['icd10Category', 'severityLevel', 'headline', 'symmetryIndex', 'symmetryNote', 'pallorMarkers', 'pallorNote', 'periorbitalSwelling', 'periorbitalNote']
};

const eyeSchema = {
  type: Type.OBJECT,
  properties: {
    icd10Category: { type: Type.STRING },
    severityLevel: { type: Type.INTEGER, description: '1, 2, or 3' },
    headline: { type: Type.STRING, description: 'Clinical summary headline' },
    conjunctivalRedness: { type: Type.NUMBER, description: 'Score 0 to 1' },
    conjunctivalNote: { type: Type.STRING },
    scleralYellowing: { type: Type.NUMBER, description: 'Score 0 to 1' },
    scleralNote: { type: Type.STRING },
    pupilResponse: { type: Type.NUMBER, description: 'Score 0 to 1' },
    pupilNote: { type: Type.STRING }
  },
  required: ['icd10Category', 'severityLevel', 'headline', 'conjunctivalRedness', 'conjunctivalNote', 'scleralYellowing', 'scleralNote', 'pupilResponse', 'pupilNote']
};

export type Finding = { label: string; confidence: number; note: string };
export type Severity = "clear" | "watch" | "review";

import { createClient } from '@/lib/supabase/server';

export type VisionResult = {
  id: string; // The saved case ID
  headline: string;
  severity: Severity;
  findings: Finding[];
  icd10Category: string;
  severityLevel: number;
  category: ScanCategory;
};

export async function processVisionScan(mode: ScanMode, base64DataUrl: string): Promise<VisionResult> {
  const ai = getClient();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }
  
  // Try to get patient_id
  let patientId = user.id;
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single() as any;
  if (profile) {
    patientId = profile.id;
  }

  const match = base64DataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image format");
  const inlineData = { mimeType: match[1], data: match[2] };

  let activeCategory: ScanCategory = 'UNKNOWN';

  // STEP 1: Route Sub-classification for SKIN
  if (mode === 'skin') {
    const classifyRes = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [{
        role: 'user',
        parts: [
          { text: "Classify this skin image into LESION_MOLE, RASH_INFLAMMATION, or UNKNOWN." },
          { inlineData }
        ]
      }],
      config: { responseMimeType: 'application/json', responseJsonSchema: skinClassifierSchema }
    });
    const cleanClassText = classifyRes.text ? classifyRes.text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim() : '{}';
    const parsedClass = JSON.parse(cleanClassText);
    activeCategory = (parsedClass.category || 'LESION_MOLE') as ScanCategory;
    if (activeCategory === 'UNKNOWN') activeCategory = 'LESION_MOLE';
  } else if (mode === 'face') {
    activeCategory = 'FACE';
  } else if (mode === 'eye') {
    activeCategory = 'EYE';
  }

  // STEP 2: Inference
  let schema: any;
  let systemPrompt = "";

  if (activeCategory === 'LESION_MOLE') {
    schema = lesionSchema;
    systemPrompt = "You are a clinical AI. Analyze this mole/lesion using ABCDE metrics. Output an ICD-10 Category and a severity level from 1 (benign/clear) to 3 (needs review).";
  } else if (activeCategory === 'RASH_INFLAMMATION') {
    schema = rashSchema;
    systemPrompt = "You are a clinical AI. Analyze this rash/inflammation. Output an ICD-10 Category and a severity level from 1 (mild/clear) to 3 (severe/needs review).";
  } else if (activeCategory === 'FACE') {
    schema = faceSchema;
    systemPrompt = "You are a clinical AI. Analyze this face for asymmetry, pallor, and periorbital swelling. Output an ICD-10 Category and a severity level from 1 (normal/clear) to 3 (abnormal/needs review).";
  } else if (activeCategory === 'EYE') {
    schema = eyeSchema;
    systemPrompt = "You are a clinical AI. Analyze this eye for conjunctival redness, scleral yellowing, and pupil appearance. Output an ICD-10 Category and a severity level from 1 (normal/clear) to 3 (abnormal/needs review).";
  } else {
    schema = lesionSchema;
    systemPrompt = "You are a clinical AI. Output an ICD-10 Category and a severity level from 1 to 3.";
  }

  const assessRes = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [{
      role: 'user',
      parts: [{ text: systemPrompt }, { inlineData }]
    }],
    config: { responseMimeType: 'application/json', responseJsonSchema: schema }
  });

  const cleanAssessText = assessRes.text ? assessRes.text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim() : '{}';
  const data = JSON.parse(cleanAssessText);
  
  const severityLevel = data.severityLevel && [1, 2, 3].includes(data.severityLevel) ? data.severityLevel : 3;
  const severityMap: Record<number, Severity> = { 1: 'clear', 2: 'watch', 3: 'review' };
  const severity = severityMap[severityLevel] || 'review';

  let findings: Finding[] = [];

  if (activeCategory === 'LESION_MOLE') {
    findings = [
      { label: "Border irregularity", confidence: data.borderIrregularity || 0, note: data.borderNote || "" },
      { label: "Pigment variation", confidence: data.pigmentVariation || 0, note: data.pigmentNote || "" },
      { label: "Surface texture", confidence: data.surfaceTexture || 0, note: data.surfaceNote || "" },
    ];
  } else if (activeCategory === 'RASH_INFLAMMATION') {
    findings = [
      { label: "Erythema intensity", confidence: data.erythemaIntensity || 0, note: data.erythemaNote || "" },
      { label: "Scaling / Flaking", confidence: data.scalingFlaking || 0, note: data.scalingNote || "" },
      { label: "Surface area", confidence: data.surfaceArea || 0, note: data.surfaceAreaNote || "" },
    ];
  } else if (activeCategory === 'FACE') {
    findings = [
      { label: "Symmetry index", confidence: data.symmetryIndex || 0, note: data.symmetryNote || "" },
      { label: "Pallor markers", confidence: data.pallorMarkers || 0, note: data.pallorNote || "" },
      { label: "Periorbital swelling", confidence: data.periorbitalSwelling || 0, note: data.periorbitalNote || "" },
    ];
  } else if (activeCategory === 'EYE') {
    findings = [
      { label: "Conjunctival redness", confidence: data.conjunctivalRedness || 0, note: data.conjunctivalNote || "" },
      { label: "Scleral yellowing", confidence: data.scleralYellowing || 0, note: data.scleralNote || "" },
      { label: "Pupil response", confidence: data.pupilResponse || 0, note: data.pupilNote || "" },
    ];
  }

  const headline = data.headline || "Assessment complete";

  // STEP 3: Save to Vault (triage_cases)
  let savedId = "";
  try {
    const supabase = getSupabaseAdmin();
    const { data: savedCase, error: insertError } = await (supabase as any).from('triage_cases').insert({
      patient_id: patientId,
      chief_complaint: `Visual scan: ${mode}`,
      ai_diagnosis: JSON.stringify({ headline, findings }),
      icd10_code: data.icd10Category || null,
      confidence_score: 0.9,
      status: 'pending'
    }).select('id').single();

    if (insertError) {
      throw insertError;
    }
    savedId = savedCase.id;
  } catch (dbErr) {
    console.error("Failed to save scan to database:", dbErr);
    throw new Error("Failed to securely save record to vault.");
  }

  return {
    id: savedId,
    headline,
    severity,
    findings,
    icd10Category: data.icd10Category || "Unknown",
    severityLevel,
    category: activeCategory
  };
}
