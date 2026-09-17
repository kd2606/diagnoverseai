export type ScanType = 'LESION_MOLE' | 'RASH_INFLAMMATION' | 'FACE' | 'EYE' | 'TRAUMA_WOUND' | 'UNKNOWN';

export const CLINICAL_MATRIX: Record<ScanType, Record<number, { precautions: string; nextSteps: string }>> = {
  LESION_MOLE: {
    1: { precautions: "Keep the area clean. Avoid scratching. Use sun protection.", nextSteps: "Monitor the lesion for any changes in size, shape, or color." },
    2: { precautions: "Keep the area clean. Avoid scratching. Use sun protection.", nextSteps: "Keep an eye on the lesion. Schedule a routine check-up with a dermatologist." },
    3: { precautions: "Do not apply home remedies.", nextSteps: "Priority clinical review required." }
  },
  RASH_INFLAMMATION: {
    1: { precautions: "Keep the area clean and dry. Avoid scratching.", nextSteps: "Monitor the area." },
    2: { precautions: "Apply a cold compress. Avoid known irritants.", nextSteps: "Monitor for spreading." },
    3: { precautions: "Do not apply unknown creams.", nextSteps: "Severe inflammation detected. Seek urgent medical evaluation." }
  },
  FACE: {
    1: { precautions: "Maintain standard hygiene.", nextSteps: "Facial symmetry appears normal." },
    2: { precautions: "Maintain standard hygiene.", nextSteps: "Mild irregularities observed. Monitor for any sudden changes." },
    3: { precautions: "Do not apply pressure to swollen areas.", nextSteps: "Significant asymmetry or swelling detected. Seek urgent clinical review." }
  },
  EYE: {
    1: { precautions: "Maintain good screen habits.", nextSteps: "Eyes appear clear." },
    2: { precautions: "Rest your eyes and avoid irritants.", nextSteps: "Mild redness or irritation." },
    3: { precautions: "Do not rub eyes.", nextSteps: "Severe redness or irregular pupil response. Seek immediate ophthalmic care." }
  },
  TRAUMA_WOUND: {
    1: { precautions: "Clean the wound with mild soap and water. Keep it covered with a sterile bandage.", nextSteps: "Monitor healing." },
    2: { precautions: "Change dressings daily.", nextSteps: "Monitor for signs of infection (redness, warmth)." },
    3: { precautions: "Do not probe the wound.", nextSteps: "Deep or infected wound suspected. Seek immediate clinical care." }
  },
  UNKNOWN: {
    1: { precautions: "Maintain standard hygiene.", nextSteps: "Monitor the area." },
    2: { precautions: "Maintain standard hygiene.", nextSteps: "Monitor the area for changes." },
    3: { precautions: "Avoid home remedies.", nextSteps: "Seek clinical evaluation." }
  }
};

/* ------------------------------------------------------------------ */
/* Voice / Text Triage — Clinical Next Steps                           */
/* Keyed by recommendedSpecialty → severity tier (1 = routine,         */
/* 2 = moderate, 3 = urgent). All text is hardcoded and safe to show   */
/* directly to patients.                                               */
/* ------------------------------------------------------------------ */

export type VoiceTriageEntry = { precautions: string; nextSteps: string };

export const VOICE_TRIAGE_MATRIX: Record<string, Record<number, VoiceTriageEntry>> = {
  'Emergency Medicine': {
    1: { precautions: "Stay calm. Keep someone near you.", nextSteps: "Your symptoms may require urgent evaluation. Contact emergency services or visit the nearest ER." },
    2: { precautions: "Do not drive yourself. Stay calm and keep someone near you.", nextSteps: "Seek immediate emergency evaluation. Call emergency services if symptoms worsen." },
    3: { precautions: "Do not delay. Call emergency services immediately.", nextSteps: "Seek immediate emergency care. Time-critical symptoms detected." },
  },
  'Cardiology': {
    1: { precautions: "Avoid heavy exertion until reviewed by a clinician. Stay hydrated.", nextSteps: "Schedule a routine cardiology follow-up." },
    2: { precautions: "Avoid heavy exertion. Monitor for changes in chest discomfort or shortness of breath.", nextSteps: "Schedule a cardiology consultation within the next few days." },
    3: { precautions: "Avoid all physical exertion. Do not ignore chest pain or pressure.", nextSteps: "Seek urgent cardiac evaluation. If chest pain worsens, call emergency services." },
  },
  'Pulmonology': {
    1: { precautions: "Avoid known respiratory irritants (smoke, dust). Stay hydrated.", nextSteps: "Monitor breathing. Schedule a routine check-up if symptoms persist." },
    2: { precautions: "Avoid respiratory irritants. Use prescribed inhalers if available.", nextSteps: "Schedule a pulmonology consultation. Monitor for worsening breathlessness." },
    3: { precautions: "Sit upright to ease breathing. Avoid exertion.", nextSteps: "Seek urgent respiratory evaluation. Call emergency services if breathing significantly worsens." },
  },
  'Neurology': {
    1: { precautions: "Get adequate rest. Avoid screen overuse.", nextSteps: "Monitor for recurring headaches or neurological changes." },
    2: { precautions: "Avoid driving if experiencing dizziness or visual changes.", nextSteps: "Schedule a neurology consultation. Note symptom patterns." },
    3: { precautions: "Do not ignore sudden severe headache, numbness, or speech difficulty.", nextSteps: "Seek urgent neurological evaluation. Call emergency services if symptoms suggest stroke." },
  },
  'Gastroenterology': {
    1: { precautions: "Maintain hydration. Eat bland foods.", nextSteps: "Monitor symptoms. Schedule a check-up if they persist beyond a few days." },
    2: { precautions: "Avoid spicy, fatty, or acidic foods. Stay well hydrated.", nextSteps: "Schedule a GI consultation. Keep a food/symptom diary." },
    3: { precautions: "Do not ignore severe abdominal pain, bloody stool, or persistent vomiting.", nextSteps: "Seek urgent GI evaluation or visit the emergency room." },
  },
  'Dermatology': {
    1: { precautions: "Keep the affected area clean. Avoid scratching.", nextSteps: "Monitor for changes. Schedule a routine dermatology visit." },
    2: { precautions: "Do not apply unknown topical products. Keep the area clean and dry.", nextSteps: "Schedule a dermatology consultation within the week." },
    3: { precautions: "Do not apply home remedies to rapidly changing lesions.", nextSteps: "Seek urgent dermatologic evaluation." },
  },
  'Psychiatry': {
    1: { precautions: "Practice self-care. Maintain regular sleep and meal schedules.", nextSteps: "Consider reaching out to a mental health professional for routine support." },
    2: { precautions: "Reach out to a trusted person. Avoid isolation.", nextSteps: "Schedule a mental health consultation. Crisis resources are available 24/7." },
    3: { precautions: "You are not alone. Please reach out for help immediately.", nextSteps: "Contact a crisis helpline or visit the nearest emergency room. Crisis Text Line: text HOME to 741741." },
  },
  'General Practice': {
    1: { precautions: "Maintain standard hygiene. Stay hydrated and rest.", nextSteps: "Monitor symptoms. Schedule a routine visit if they persist." },
    2: { precautions: "Rest and stay hydrated. Avoid strenuous activity.", nextSteps: "Schedule a visit with your primary care provider within the next few days." },
    3: { precautions: "Do not ignore persistent or worsening symptoms.", nextSteps: "Seek prompt medical evaluation from your primary care provider or urgent care." },
  },
  'Insufficient Information': {
    1: { precautions: "Maintain standard hygiene and wellness practices.", nextSteps: "If you have specific concerns, try describing your symptoms in more detail." },
    2: { precautions: "Maintain standard hygiene and wellness practices.", nextSteps: "Consider providing more detail about your symptoms for a more specific assessment." },
    3: { precautions: "If you are experiencing a medical emergency, call emergency services.", nextSteps: "Please describe your symptoms in more detail, or seek in-person medical evaluation." },
  },
  DEFAULT: {
    1: { precautions: "Maintain standard hygiene and wellness practices.", nextSteps: "Monitor your symptoms. Schedule a routine check-up if they persist." },
    2: { precautions: "Rest and monitor for changes. Avoid self-medication.", nextSteps: "Schedule a consultation with the appropriate specialist." },
    3: { precautions: "Do not ignore persistent or worsening symptoms.", nextSteps: "Seek prompt specialist evaluation or visit urgent care." },
  },
};

/**
 * Maps AI confidence score + specialty to a clinical severity tier.
 * Emergency Medicine always returns severity 3 (urgent).
 */
export function confidenceToSeverity(confidence: number, specialty: string): 1 | 2 | 3 {
  if (specialty === 'Emergency Medicine') return 3;
  if (confidence >= 0.75) return 1;
  if (confidence >= 0.45) return 2;
  return 3;
}

/**
 * Look up hardcoded clinical guidance for a voice triage result.
 * Falls back to DEFAULT if the specialty isn't in the matrix.
 */
export function getVoiceTriageGuidance(
  specialty: string,
  severity: 1 | 2 | 3,
): VoiceTriageEntry {
  const bucket = VOICE_TRIAGE_MATRIX[specialty] ?? VOICE_TRIAGE_MATRIX['DEFAULT'];
  return bucket[severity];
}
