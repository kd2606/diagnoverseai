// src/lib/patient/format.ts

export function formatBytes(bytes: number, precision = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : precision)} ${units[i]}`;
}

export function compressionRatio(bytesIn: number, bytesOut: number): string {
  if (!bytesIn || !bytesOut) return '—';
  return `${(bytesIn / bytesOut).toFixed(1)}×`;
}

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (Math.abs(mins) < 60) return RTF.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return RTF.format(-hours, 'hour');
  return RTF.format(-Math.round(hours / 24), 'day');
}
