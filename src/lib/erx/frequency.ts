export const DOSE_SLOTS = ['EARLY_MORNING', 'MORNING', 'NOON', 'AFTERNOON', 'EVENING', 'NIGHT'] as const;
export type DoseSlot = (typeof DOSE_SLOTS)[number];

export type FoodRelation = 'BEFORE_FOOD' | 'AFTER_FOOD' | 'WITH_FOOD' | null;
export type ParseConfidence = 'EXACT' | 'INFERRED' | 'UNRECOGNISED';

export interface ScheduleWindow {
  /** 'HH:mm' — patient's usual waking hour. */
  readonly wakeTime: string;
  /** 'HH:mm' — patient's usual bedtime. */
  readonly sleepTime: string;
}

export const DEFAULT_SCHEDULE_WINDOW: ScheduleWindow = { wakeTime: '08:00', sleepTime: '22:00' };

export interface ReminderTime {
  readonly slot: DoseSlot;
  /** 'HH:mm', 24-hour, local to the patient's timezone. */
  readonly time: string;
  readonly label: string;
}

export interface FrequencySchedule {
  readonly input: string;
  readonly normalised: string;
  readonly dosesPerDay: number;
  /** 1 = daily, 2 = alternate days, 7 = weekly. */
  readonly cadenceDays: number;
  readonly intervalHours: number | null;
  readonly isAsNeeded: boolean;
  readonly foodRelation: FoodRelation;
  readonly confidence: ParseConfidence;
  readonly requiresReview: boolean;
  readonly reminders: readonly ReminderTime[];
}

const SLOT_LABELS: Record<DoseSlot, string> = {
  EARLY_MORNING: 'Early morning',
  MORNING: 'Morning',
  NOON: 'Noon',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
  NIGHT: 'Night',
};

const SLOT_DEFAULT_TIME: Record<DoseSlot, string> = {
  EARLY_MORNING: '06:00',
  MORNING: '09:00',
  NOON: '13:00',
  AFTERNOON: '15:00',
  EVENING: '18:00',
  NIGHT: '21:00',
};

// ── time helpers ────────────────────────────────────────────────────────────
const MINUTES_PER_DAY = 1440;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  const hours = Number.parseInt(h ?? '0', 10);
  const minutes = Number.parseInt(m ?? '0', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return (hours * 60 + minutes) % MINUTES_PER_DAY;
}

function toHHmm(totalMinutes: number): string {
  const rounded = Math.round(((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY / 15) * 15;
  const normalised = rounded % MINUTES_PER_DAY;
  const hours = Math.floor(normalised / 60);
  const minutes = normalised % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function slotForTime(hhmm: string): DoseSlot {
  const minutes = toMinutes(hhmm);
  if (minutes < 6 * 60) return 'EARLY_MORNING';
  if (minutes < 12 * 60) return 'MORNING';
  if (minutes < 14 * 60) return 'NOON';
  if (minutes < 17 * 60) return 'AFTERNOON';
  if (minutes < 21 * 60) return 'EVENING';
  return 'NIGHT';
}

function reminderAt(hhmm: string, qty = 1): ReminderTime {
  const slot = slotForTime(hhmm);
  return { slot, time: hhmm, label: qty === 1 ? SLOT_LABELS[slot] : `${qty}× ${SLOT_LABELS[slot].toLowerCase()}` };
}

/** Spread N doses evenly across the waking window, padded one hour inside each edge. */
function spreadAcrossWakingHours(doses: number, window: ScheduleWindow): ReminderTime[] {
  const wake = toMinutes(window.wakeTime);
  const sleepRaw = toMinutes(window.sleepTime);
  const sleep = sleepRaw > wake ? sleepRaw : sleepRaw + MINUTES_PER_DAY;

  const start = wake + 60;
  const end = Math.max(sleep - 60, start);

  if (doses <= 1) return [reminderAt(toHHmm(start))];

  const step = (end - start) / (doses - 1);
  return Array.from({ length: doses }, (_, index) => reminderAt(toHHmm(start + step * index)));
}

/** Round-the-clock dosing (e.g. q6h) — anchored to the wake time. */
function spreadAcrossFullDay(intervalHours: number, window: ScheduleWindow): ReminderTime[] {
  const doses = Math.max(1, Math.min(12, Math.round(24 / intervalHours)));
  const anchor = toMinutes(window.wakeTime);
  return Array.from({ length: doses }, (_, index) => reminderAt(toHHmm(anchor + index * intervalHours * 60)));
}

// ── pattern rules ───────────────────────────────────────────────────────────
interface FrequencyRule {
  readonly pattern: RegExp;
  readonly normalised: string;
  readonly dosesPerDay: number;
  readonly cadenceDays?: number;
  readonly fixedSlots?: readonly DoseSlot[];
}

/** Order matters: the most specific patterns must come first. */
const RULES: readonly FrequencyRule[] = [
  { pattern: /\b(hs|nocte|at bedtime|before bed|bed time|at night only)\b/, normalised: 'HS (at bedtime)', dosesPerDay: 1, fixedSlots: ['NIGHT'] },
  { pattern: /\b(om|mane|morning only|early morning)\b/, normalised: 'OM (every morning)', dosesPerDay: 1, fixedSlots: ['MORNING'] },
  { pattern: /\b(qid|qds|q6h|four times (a )?(day|daily)|4 times (a )?(day|daily))\b/, normalised: 'QID (four times daily)', dosesPerDay: 4 },
  { pattern: /\b(tds|tid|q8h|thrice (a )?(day|daily)|three times (a )?(day|daily)|3 times (a )?(day|daily))\b/, normalised: 'TDS (three times daily)', dosesPerDay: 3 },
  { pattern: /\b(bd|bid|q12h|twice (a )?(day|daily)|two times (a )?(day|daily)|2 times (a )?(day|daily)|morning and (night|evening))\b/, normalised: 'BD (twice daily)', dosesPerDay: 2 },
  { pattern: /\b(five times (a )?(day|daily)|5 times (a )?(day|daily))\b/, normalised: 'Five times daily', dosesPerDay: 5 },
  { pattern: /\b(alternate days?|every other day|eod|alternate day)\b/, normalised: 'Alternate days', dosesPerDay: 1, cadenceDays: 2 },
  { pattern: /\b(once (a )?week(ly)?|weekly|q ?week|qwk)\b/, normalised: 'Once weekly', dosesPerDay: 1, cadenceDays: 7 },
  { pattern: /\b(od|sid|once (a )?(day|daily)|one time (a )?(day|daily)|1 time (a )?(day|daily)|daily|every day)\b/, normalised: 'OD (once daily)', dosesPerDay: 1 },
];

const AS_NEEDED = /\b(sos|prn|p\.r\.n|as (and when )?(needed|required)|if (needed|required)|when required)\b/;
const DASH_NOTATION = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?$/;
const INTERVAL = /\b(?:every\s*(\d{1,2})\s*(?:h|hr|hrs|hour|hours)|q\s?(\d{1,2})\s?h)\b/;
const TIMES_PER_DAY = /\b(\d{1,2})\s*(?:times?|x|\/)\s*(?:a\s*|per\s*)?day\b/;

function detectFoodRelation(text: string): FoodRelation {
  if (/\b(before (food|meals?|breakfast)|empty stomach|ac\b)\b/.test(text)) return 'BEFORE_FOOD';
  if (/\b(after (food|meals?)|post ?prandial|pc\b)\b/.test(text)) return 'AFTER_FOOD';
  if (/\b(with (food|meals?)|during meals?)\b/.test(text)) return 'WITH_FOOD';
  return null;
}

function normaliseText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[.,;()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a human frequency string into concrete reminder times.
 * Pure and deterministic — safe to call on the server (persistence) and on the
 * client (preview) and to unit-test exhaustively.
 *
 * generateReminders('Twice daily')  -> 09:00 (Morning), 21:00 (Night)
 * generateReminders('1-0-1')        -> 09:00 (Morning), 21:00 (Night)
 * generateReminders('q8h')          -> 09:00, 17:00, 01:00
 * generateReminders('SOS')          -> [] with isAsNeeded = true
 */
export function generateReminders(
  frequency: string,
  window: ScheduleWindow = DEFAULT_SCHEDULE_WINDOW,
): FrequencySchedule {
  const input = frequency ?? '';
  const text = normaliseText(input);
  const foodRelation = detectFoodRelation(text);

  const base = {
    input,
    cadenceDays: 1,
    intervalHours: null,
    isAsNeeded: false,
    foodRelation,
  } as const;

  if (text.length === 0) {
    return { ...base, normalised: 'Unspecified', dosesPerDay: 0, confidence: 'UNRECOGNISED', requiresReview: true, reminders: [] };
  }

  // 1. As-needed dosing has no clock schedule.
  if (AS_NEEDED.test(text)) {
    return { ...base, normalised: 'SOS (as needed)', dosesPerDay: 0, isAsNeeded: true, confidence: 'EXACT', requiresReview: false, reminders: [] };
  }

  // 2. Indian dash notation: 1-0-1 (morning-afternoon-night) or 1-1-1-1.
  const dash = DASH_NOTATION.exec(text.replace(/\s/g, ''));
  if (dash) {
    const quantities = [dash[1], dash[2], dash[3], dash[4]]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => Number.parseFloat(value));

    const slots: readonly DoseSlot[] =
      quantities.length === 4
        ? (['MORNING', 'NOON', 'EVENING', 'NIGHT'] as const)
        : (['MORNING', 'AFTERNOON', 'NIGHT'] as const);

    const reminders = quantities
      .map((qty, index) => ({ qty, slot: slots[index] }))
      .filter((entry): entry is { qty: number; slot: DoseSlot } => entry.qty > 0 && entry.slot !== undefined)
      .map(({ qty, slot }) => reminderAt(SLOT_DEFAULT_TIME[slot], qty));

    return {
      ...base,
      normalised: quantities.join('-'),
      dosesPerDay: reminders.length,
      confidence: reminders.length > 0 ? 'EXACT' : 'UNRECOGNISED',
      requiresReview: reminders.length === 0,
      reminders,
    };
  }

  // 3. Fixed-interval dosing.
  const interval = INTERVAL.exec(text);
  const intervalHours = interval ? Number.parseInt(interval[1] ?? interval[2] ?? '', 10) : Number.NaN;
  if (Number.isFinite(intervalHours) && intervalHours >= 1 && intervalHours <= 24) {
    const reminders = spreadAcrossFullDay(intervalHours, window);
    return {
      ...base,
      normalised: `Every ${intervalHours} hours`,
      dosesPerDay: reminders.length,
      intervalHours,
      confidence: 'EXACT',
      requiresReview: false,
      reminders,
    };
  }

  // 4. Known clinical abbreviations and plain-English phrases.
  for (const rule of RULES) {
    if (!rule.pattern.test(text)) continue;
    const reminders = rule.fixedSlots
      ? rule.fixedSlots.map((slot) => reminderAt(SLOT_DEFAULT_TIME[slot]))
      : spreadAcrossWakingHours(rule.dosesPerDay, window);

    return {
      ...base,
      normalised: rule.normalised,
      dosesPerDay: rule.dosesPerDay,
      cadenceDays: rule.cadenceDays ?? 1,
      confidence: rule.fixedSlots ? 'EXACT' : 'INFERRED',
      requiresReview: false,
      reminders,
    };
  }

  // 5. Numeric "N times a day" as a last structured attempt.
  const timesPerDay = TIMES_PER_DAY.exec(text);
  const parsedDoses = timesPerDay ? Number.parseInt(timesPerDay[1] ?? '', 10) : Number.NaN;
  if (Number.isFinite(parsedDoses) && parsedDoses >= 1 && parsedDoses <= 8) {
    return {
      ...base,
      normalised: `${parsedDoses} times daily`,
      dosesPerDay: parsedDoses,
      confidence: 'INFERRED',
      requiresReview: false,
      reminders: spreadAcrossWakingHours(parsedDoses, window),
    };
  }

  // 6. Unparseable: never guess. Flag for pharmacist/doctor review.
  return {
    ...base,
    normalised: input.trim(),
    dosesPerDay: 0,
    confidence: 'UNRECOGNISED',
    requiresReview: true,
    reminders: [],
  };
}

// ── course-level helpers used by the vault UI and the reminder worker ────────
const DAY_MS = 86_400_000;

function toUtcMidnight(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`);
}

export function courseEndDate(startDate: string, durationDays: number): string {
  const end = new Date(toUtcMidnight(startDate) + (durationDays - 1) * DAY_MS);
  return end.toISOString().slice(0, 10);
}

export function isCourseActiveOn(startDate: string, durationDays: number, onDate: string): boolean {
  const day = toUtcMidnight(onDate);
  return day >= toUtcMidnight(startDate) && day <= toUtcMidnight(courseEndDate(startDate, durationDays));
}

/** Handles alternate-day / weekly cadence. */
export function isDoseDueOn(startDate: string, cadenceDays: number, onDate: string): boolean {
  if (cadenceDays <= 1) return true;
  const elapsedDays = Math.round((toUtcMidnight(onDate) - toUtcMidnight(startDate)) / DAY_MS);
  return elapsedDays >= 0 && elapsedDays % cadenceDays === 0;
}
