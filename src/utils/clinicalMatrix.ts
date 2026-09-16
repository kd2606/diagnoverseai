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
