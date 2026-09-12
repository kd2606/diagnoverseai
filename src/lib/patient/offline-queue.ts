// src/lib/patient/offline-queue.ts
import type { ScanModality } from './types';

const DB_NAME = 'diagnoverse-edge';
const DB_VERSION = 1;
const STORE = 'upload-queue';
const CHANNEL = 'diagnoverse-queue';

export type QueuedUpload = {
  id: string;
  patientId: string;
  modality: ScanModality;
  fileName: string;
  bytesIn: number;
  bytesOut: number;
  blob: Blob;
  checksum: string;
  /** Resumable TUS upload URL, persisted so a refresh never restarts a transfer. */
  tusUrl?: string;
  offset: number;
  attempts: number;
  createdAt: number;
  status: 'queued' | 'uploading' | 'synced' | 'failed';
};

export type QueueStats = {
  pending: number;
  uploading: number;
  synced: number;
  failed: number;
  pendingBytes: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-idb'));
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

let channel: BroadcastChannel | null = null;
function bus(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

function announce() {
  bus()?.postMessage('changed');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('diagnoverse:queue-changed'));
  }
}

export async function enqueue(item: QueuedUpload): Promise<void> {
  await tx('readwrite', (s) => s.put(item));
  announce();
}

export async function patchQueued(id: string, patch: Partial<QueuedUpload>): Promise<void> {
  const existing = await tx<QueuedUpload | undefined>('readonly', (s) => s.get(id));
  if (!existing) return;
  await tx('readwrite', (s) => s.put({ ...existing, ...patch }));
  announce();
}

export async function removeQueued(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
  announce();
}

export async function listQueue(): Promise<QueuedUpload[]> {
  try {
    const all = await tx<QueuedUpload[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedUpload[]>);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function computeStats(items: QueuedUpload[]): QueueStats {
  return items.reduce<QueueStats>(
    (acc, i) => {
      if (i.status === 'queued') { acc.pending += 1; acc.pendingBytes += i.bytesOut; }
      if (i.status === 'uploading') acc.uploading += 1;
      if (i.status === 'synced') acc.synced += 1;
      if (i.status === 'failed') acc.failed += 1;
      return acc;
    },
    { pending: 0, uploading: 0, synced: 0, failed: 0, pendingBytes: 0 },
  );
}

export function subscribeQueue(onChange: () => void): () => void {
  const b = bus();
  b?.addEventListener('message', onChange);
  window.addEventListener('diagnoverse:queue-changed', onChange);
  return () => {
    b?.removeEventListener('message', onChange);
    window.removeEventListener('diagnoverse:queue-changed', onChange);
  };
}
