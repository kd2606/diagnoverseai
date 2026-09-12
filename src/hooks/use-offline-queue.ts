'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  computeStats, listQueue, subscribeQueue,
  type QueueStats, type QueuedUpload,
} from '@/lib/patient/offline-queue';

const EMPTY: QueueStats = { pending: 0, uploading: 0, synced: 0, failed: 0, pendingBytes: 0 };

export function useOfflineQueue() {
  const [items, setItems] = useState<QueuedUpload[]>([]);
  const [stats, setStats] = useState<QueueStats>(EMPTY);
  const [online, setOnline] = useState(true);

  const refresh = useCallback(async () => {
    const next = await listQueue();
    setItems(next);
    setStats(computeStats(next));
  }, []);

  useEffect(() => {
    void refresh();
    const unsub = subscribeQueue(() => void refresh());

    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);

    return () => {
      unsub();
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, [refresh]);

  return { items, stats, online, refresh };
}
