import { openDB, DBSchema } from 'idb';
import { supabase } from '@/lib/supabase/client';
import * as tus from 'tus-js-client';

interface DiagnoVerseDBSchema extends DBSchema {
  syncQueue: {
    key: string;
    value: {
      recordId: string;
      blob: Blob;
      storagePath: string;
      userId: string;
      filename: string;
      timestamp: number;
    };
  };
}

export async function initDB() {
  return openDB<DiagnoVerseDBSchema>('DiagnoVerseDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'recordId' });
      }
    },
  });
}

export async function addToQueue(recordId: string, blob: Blob, storagePath: string, userId: string, filename: string) {
  const db = await initDB();
  await db.put('syncQueue', {
    recordId,
    blob,
    storagePath,
    userId,
    filename,
    timestamp: Date.now()
  });
}

export async function getQueueCount(): Promise<number> {
  const db = await initDB();
  return db.count('syncQueue');
}

export async function flushQueue(): Promise<void> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return; // Don't attempt flush if we know we are offline
  }

  const db = await initDB();
  const allItems = await db.getAll('syncQueue');

  if (allItems.length === 0) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  for (const item of allItems) {
    try {
      // 1. Insert into DB (Idempotent: ignore duplicate key error if already inserted)
      const { error: dbError } = await supabase
        .from('medical_records')
        .insert({
          id: item.recordId,
          patient_id: item.userId,
          title: item.filename || 'Offline Uploaded Scan',
          document_type: 'xray',
          storage_path: item.storagePath
        });

      if (dbError && !dbError.message.toLowerCase().includes('duplicate key')) {
        console.error("Flush DB Error:", dbError);
        continue;
      }

      // 2. Upload to Storage via TUS resumable uploads with exponential backoff
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(item.blob, {
          endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [2000, 4000, 8000, 16000], // Exponential backoff
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          metadata: {
            bucketName: 'medical-records',
            objectName: item.storagePath,
            contentType: 'image/webp',
          },
          chunkSize: 6 * 1024 * 1024, // 6MB chunking
          onError: (error) => reject(error),
          onSuccess: () => resolve(),
        });

        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        }).catch(reject);
      });

      // 3. Generate Signed URL
      const { data: signedData, error: signError } = await supabase.storage
        .from('medical-records')
        .createSignedUrl(item.storagePath, 3600);

      if (signError || !signedData) {
        console.error("Flush Signed URL Error:", signError);
        continue;
      }

      // 4. Call AI Analysis Endpoint
      const res = await fetch('/api/ai/analyze-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: item.recordId,
          image_url: signedData.signedUrl
        })
      });

      if (!res.ok) {
        console.error("Flush API Error:", await res.text());
        continue;
      }

      // 5. Delete from queue upon success
      await db.delete('syncQueue', item.recordId);

    } catch (err) {
      console.error("Failed to sync item:", item.recordId, err);
    }
  }
}
