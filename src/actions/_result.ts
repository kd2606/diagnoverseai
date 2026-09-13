export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = <T = never>(
  error: string,
  code?: string,
): ActionResult<T> => ({ ok: false, error, code });

export function safeError(context: string, err: unknown): string {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[DiagnoVerse] ${context}:`, err);
  }
  return `${context}. Please retry or contact your administrator.`;
}
