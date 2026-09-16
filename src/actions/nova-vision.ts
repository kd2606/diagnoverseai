'use server';

import { GoogleGenAI, Type } from '@google/genai';

const MODEL_ID = process.env.NOVA_GEMINI_MODEL ?? 'gemini-3.8-flash';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  return new GoogleGenAI({ apiKey });
}

export type ScanCategory = 'LESION_MOLE' | 'RASH_INFLAMMATION' | 'TRAUMA_WOUND' | 'UNKNOWN';

const classifierSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ['LESION_MOLE', 'RASH_INFLAMMATION', 'TRAUMA_WOUND', 'UNKNOWN']
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

const traumaSchema = {
  type: Type.OBJECT,
  properties: {
    icd10Category: { type: Type.STRING },
    severityLevel: { type: Type.INTEGER, description: '1, 2, or 3' },
    headline: { type: Type.STRING, description: 'Clinical summary headline' },
    bleeding: { type: Type.NUMBER, description: 'Score 0 to 1' },
    bleedingNote: { type: Type.STRING },
    depthEstimate: { type: Type.NUMBER, description: 'Score 0 to 1' },
    depthNote: { type: Type.STRING },
    infectionSigns: { type: Type.NUMBER, description: 'Score 0 to 1' },
    infectionNote: { type: Type.STRING }
  },
  required: ['icd10Category', 'severityLevel', 'headline', 'bleeding', 'bleedingNote', 'depthEstimate', 'depthNote', 'infectionSigns', 'infectionNote']
};

export type Finding = { label: string; confidence: number; note: string };
export type Severity = "clear" | "watch" | "review";

export type VisionResult = {
  headline: string;
  severity: Severity;
  findings: Finding[];
  icd10Category: string;
  severityLevel: number;
  category: ScanCategory;
};

export async function processVisionScan(base64DataUrl: string): Promise<VisionResult> {
  const ai = getClient();
  
  // Extract base64 from data URL
  const match = base64DataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image format");
  const mimeType = match[1];
  const base64Data = match[2];

  const inlineData = { mimeType, data: base64Data };

  // STEP 1: Classify
  const classifyRes = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [{
      role: 'user',
      parts: [
        { text: "Classify this clinical image into one of the following categories: LESION_MOLE, RASH_INFLAMMATION, TRAUMA_WOUND, or UNKNOWN if none clearly fit." },
        { inlineData }
      ]
    }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: classifierSchema,
    }
  });

  const parsedClass = JSON.parse(classifyRes.text || '{}');
  const category = (parsedClass.category || 'UNKNOWN') as ScanCategory;
  
  // Fallback to trauma if unknown but we still want to analyze
  const activeCategory = category === 'UNKNOWN' ? 'TRAUMA_WOUND' : category;

  // STEP 2: Inference
  let schema: any;
  let systemPrompt = "";

  if (activeCategory === 'LESION_MOLE') {
    schema = lesionSchema;
    systemPrompt = "You are a clinical AI. Analyze this mole/lesion using ABCDE metrics. Output an ICD-10 Category and a severity level from 1 (benign/clear) to 3 (needs review).";
  } else if (activeCategory === 'RASH_INFLAMMATION') {
    schema = rashSchema;
    systemPrompt = "You are a clinical AI. Analyze this rash/inflammation. Output an ICD-10 Category and a severity level from 1 (mild/clear) to 3 (severe/needs review).";
  } else {
    schema = traumaSchema;
    systemPrompt = "You are a clinical AI. Analyze this trauma/wound. Output an ICD-10 Category and a severity level from 1 (superficial/clear) to 3 (deep/infected/needs review).";
  }

  const assessRes = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [{
      role: 'user',
      parts: [
        { text: systemPrompt },
        { inlineData }
      ]
    }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
    }
  });

  const data = JSON.parse(assessRes.text || '{}');
  const severityMap: Record<number, Severity> = {
    1: 'clear',
    2: 'watch',
    3: 'review'
  };
  
  const severityLevel = data.severityLevel && [1, 2, 3].includes(data.severityLevel) ? data.severityLevel : 3;
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
  } else {
    findings = [
      { label: "Bleeding", confidence: data.bleeding || 0, note: data.bleedingNote || "" },
      { label: "Depth estimate", confidence: data.depthEstimate || 0, note: data.depthNote || "" },
      { label: "Infection signs", confidence: data.infectionSigns || 0, note: data.infectionNote || "" },
    ];
  }

  return {
    headline: data.headline || "Assessment complete",
    severity,
    findings,
    icd10Category: data.icd10Category || "Unknown",
    severityLevel,
    category: activeCategory
  };
}
