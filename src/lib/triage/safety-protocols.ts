/**
 * Zero-Trust deterministic safety layer.
 *
 * These regexes run BEFORE the model's output is trusted. A hit is a hard
 * bypass: the case is escalated regardless of the model's confidence, and
 * one-click approval is disabled in the UI. Pure + synchronous by design so
 * it is auditable, testable, and identical on server and client.
 */

export type ProtocolSeverity = "critical" | "urgent";

export interface SafetyProtocol {
  id: string;
  label: string;
  severity: ProtocolSeverity;
  routeTo: string;
  /** Kept global+sticky-free: cloned per execution to avoid lastIndex bleed. */
  pattern: RegExp;
}

export interface ProtocolHit {
  protocolId: string;
  label: string;
  severity: ProtocolSeverity;
  routeTo: string;
  source: string;
  matched: string;
  start: number;
  end: number;
}

export const SAFETY_PROTOCOLS: readonly SafetyProtocol[] = [
  {
    id: "CARDIO-01",
    label: "ACS Rule-Out",
    severity: "critical",
    routeTo: "Cardiology",
    pattern:
      /\b(chest (?:pain|pressure|tightness|heaviness)|crushing substernal|radiating to (?:left )?(?:arm|jaw))\b/gi,
  },
  {
    id: "NEURO-01",
    label: "Stroke Window",
    severity: "critical",
    routeTo: "Neurology",
    pattern:
      /\b(facial droop|slurred speech|sudden (?:weakness|numbness)|worst headache of (?:my|their) life|unilateral weakness)\b/gi,
  },
  {
    id: "RESP-01",
    label: "Airway Compromise",
    severity: "critical",
    routeTo: "Emergency Medicine",
    pattern: /\b(can(?:'|no)?t breathe|cannot breathe|stridor|gasping|spo2 (?:of )?(?:8[0-9]|[0-7][0-9])%?)\b/gi,
  },
  {
    id: "SEPSIS-01",
    label: "Sepsis Bundle",
    severity: "urgent",
    routeTo: "Critical Care",
    pattern: /\b(rigors|mottled skin|febrile (?:and )?hypotensive|lactate (?:of )?[2-9](?:\.\d)?)\b/gi,
  },
  {
    id: "PSYCH-01",
    label: "Self-Harm Risk",
    severity: "critical",
    routeTo: "Crisis Liaison Psychiatry",
    pattern: /\b(wants? to end it|harm (?:myself|himself|herself|themselves)|no reason to be here)\b/gi,
  },
  {
    id: "OBGYN-01",
    label: "Obstetric Red Flag",
    severity: "urgent",
    routeTo: "Obstetrics",
    pattern: /\b(reduced fetal movement|heavy vaginal bleeding|\b\d{1,2} weeks pregnant\b.*\bbleeding)\b/gi,
  },
] as const;

/** Runs every protocol over one or more free-text fields. Order-stable. */
export function runSafetyProtocols(
  fields: Record<string, string | undefined>,
): ProtocolHit[] {
  const hits: ProtocolHit[] = [];

  for (const protocol of SAFETY_PROTOCOLS) {
    for (const [source, text] of Object.entries(fields)) {
      if (!text) continue;
      const rx = new RegExp(protocol.pattern.source, protocol.pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = rx.exec(text)) !== null) {
        hits.push({
          protocolId: protocol.id,
          label: protocol.label,
          severity: protocol.severity,
          routeTo: protocol.routeTo,
          source,
          matched: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
        if (match[0].length === 0) rx.lastIndex += 1;
      }
    }
  }

  return hits;
}

/** Human-readable pattern for the audit tag, e.g. `/chest pain/i`. */
export function protocolSignature(protocolId: string): string {
  const p = SAFETY_PROTOCOLS.find((x) => x.id === protocolId);
  if (!p) return "—";
  const head = p.pattern.source.slice(0, 34).replace(/\\b/g, "");
  return `/${head}${p.pattern.source.length > 34 ? "…" : ""}/i`;
}

/** Splits text into highlightable segments for the reasoning panel. */
export function segmentMatches(
  text: string,
  hits: ProtocolHit[],
): Array<{ text: string; hit?: ProtocolHit }> {
  const ranges = hits
    .slice()
    .sort((a, b) => a.start - b.start)
    .filter((h, i, arr) => i === 0 || h.start >= arr[i - 1].end);

  const out: Array<{ text: string; hit?: ProtocolHit }> = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) out.push({ text: text.slice(cursor, r.start) });
    out.push({ text: text.slice(r.start, r.end), hit: r });
    cursor = r.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}
