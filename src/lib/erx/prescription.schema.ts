import { z } from 'zod';

export const MEDICATION_ROUTES = [
  'ORAL', 'TOPICAL', 'INHALED', 'INJECTION', 'OPHTHALMIC', 'OTIC', 'NASAL', 'RECTAL', 'SUBLINGUAL',
] as const;
export type MedicationRoute = (typeof MEDICATION_ROUTES)[number];

/**
 * Illustrative only — NOT a complete List X / NDPS control list.
 * Replace with a maintained molecule table reviewed by your compliance team
 * before go-live; teleconsultation prescribing restrictions carry legal weight.
 */
const TELEMEDICINE_RESTRICTED_MOLECULES: readonly string[] = [
  'morphine', 'fentanyl', 'pethidine', 'methadone', 'buprenorphine', 'ketamine',
];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const prescriptionItemInputSchema = z.object({
  medication_name: z.string().trim().min(2).max(200),
  strength: z.string().trim().max(50).optional(),
  dosage: z.string().trim().min(1).max(100),
  frequency: z.string().trim().min(2).max(100),
  route: z.enum(MEDICATION_ROUTES).default('ORAL'),
  duration_days: z.number().int().min(1).max(180),
  start_date: isoDate.optional(),
  instructions: z.string().trim().max(500).optional(),
  is_sos: z.boolean().default(false),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemInputSchema>;

export const createPrescriptionInputSchema = z
  .object({
    patient_id: z.string().uuid(),
    encounter_id: z.string().uuid().optional(),
    diagnosis: z.string().trim().min(3).max(300),
    clinical_notes: z.string().trim().max(2000).optional(),
    valid_until: isoDate.optional(),
    items: z.array(prescriptionItemInputSchema).min(1, 'Add at least one medication').max(15),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.items.forEach((item, index) => {
      const key = `${item.medication_name.toLowerCase()}|${(item.strength ?? '').toLowerCase()}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'medication_name'],
          message: 'Duplicate medication and strength in the same prescription',
        });
      }
      seen.add(key);

      const lower = item.medication_name.toLowerCase();
      if (TELEMEDICINE_RESTRICTED_MOLECULES.some((molecule) => lower.includes(molecule))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'medication_name'],
          message: 'This molecule cannot be prescribed through a teleconsultation',
        });
      }
    });
  });

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionInputSchema>;
