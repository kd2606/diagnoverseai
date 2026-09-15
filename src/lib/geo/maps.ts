import type { ClinicalSpecialty } from '@/lib/ai/schemas/triage.schema';

/**
 * India-tuned search keywords. Google Maps ranks colloquial practitioner terms
 * ("cardiologist") far better than academic specialty names ("Cardiology").
 */
const SPECIALTY_SEARCH_TERMS: Record<ClinicalSpecialty, string> = {
  'Emergency Medicine': 'emergency hospital casualty 24 hours',
  'General Medicine': 'general physician clinic',
  Pediatrics: 'pediatrician child specialist',
  Cardiology: 'cardiologist heart specialist',
  Pulmonology: 'pulmonologist chest specialist',
  Gastroenterology: 'gastroenterologist',
  Neurology: 'neurologist',
  Nephrology: 'nephrologist kidney specialist',
  Endocrinology: 'endocrinologist diabetologist',
  Orthopedics: 'orthopedic doctor bone specialist',
  Rheumatology: 'rheumatologist',
  Dermatology: 'dermatologist skin specialist',
  Ophthalmology: 'eye hospital ophthalmologist',
  ENT: 'ENT specialist',
  Dentistry: 'dental clinic dentist',
  Urology: 'urologist',
  'Obstetrics & Gynaecology': 'gynecologist maternity hospital',
  Psychiatry: 'psychiatrist mental health clinic',
  'General Surgery': 'general surgeon',
  Oncology: 'oncologist cancer hospital',
  'Infectious Disease': 'infectious disease specialist',
  Physiotherapy: 'physiotherapy clinic',
};

export interface MapsCoords {
  readonly latitude: number;
  readonly longitude: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
/** ~11 m resolution: enough for local search, far less identifying than a raw fix. */
const coarse = (value: number): string => value.toFixed(4);

export function specialtySearchTerm(specialty: ClinicalSpecialty): string {
  return SPECIALTY_SEARCH_TERMS[specialty];
}

/**
 * Nearby search centred on the user.
 * Uses the /maps/search/<query>/@lat,lng,zoom form because it actually recentres
 * the map. (The officially documented `?api=1&query=` form cannot take a
 * separate map centre, so we fall back to embedding the coordinates in the query.)
 */
export function buildNearbySpecialistUrl(specialty: ClinicalSpecialty, coords: MapsCoords, zoom = 14): string {
  const lat = coarse(clamp(coords.latitude, -90, 90));
  const lng = coarse(clamp(coords.longitude, -180, 180));
  const term = encodeURIComponent(specialtySearchTerm(specialty));
  return `https://www.google.com/maps/search/${term}/@${lat},${lng},${clamp(zoom, 3, 20)}z`;
}

/** Fallback when location is denied/unavailable: free-text area (city, locality or PIN code). */
export function buildAreaSpecialistUrl(specialty: ClinicalSpecialty, area: string): string {
  const cleaned = area.trim().replace(/\s+/g, ' ').slice(0, 80);
  const query = cleaned ? `${specialtySearchTerm(specialty)} in ${cleaned}` : specialtySearchTerm(specialty);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
