/**
 * Background Sync Worker
 *
 * 백그라운드에서 IndexedDB의 변경사항을 서버와 동기화
 * - 배치 처리로 API 호출 최소화
 * - 자동 재시도 (exponential backoff)
 * - 충돌 해결 (Last-Write-Wins)
 */

// TypeScript types for worker
interface SyncItem {
  id: string;
  type: 'note' | 'pageNote' | 'file';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface BatchSyncRequest {
  notes?: any[];
  pageNotes?: any[];
  files?: any[];
  deletions?: Array<{ type: string; id: string }>;
}

// Configuration
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000; // 2 seconds
const MAX_RETRY_COUNT = 3;
const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

// State
let syncQueue: SyncItem[] = [];
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isOnline = true;

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SYNC_BATCH':
      handleSyncBatch(payload);
      break;
    case 'SYNC_NOW':
      flushSyncQueue();
      break;
    case 'CLEAR_QUEUE':
      syncQueue = [];
      break;
    case 'SET_ONLINE':
      isOnline = payload;
      if (isOnline) flushSyncQueue();
      break;
  }
});

// Handle batch sync request
function handleSyncBatch(items: SyncItem[]) {
  // Add to queue
  syncQueue.push(...items);

  // Debounce sync
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    flushSyncQueue();
  }, BATCH_DELAY_MS);
}

// Flush sync queue to server
async function flushSyncQueue() {
  if (syncQueue.length === 0 || !isOnline) return;

  // Take batch from queue
  const batch = syncQueue.splice(0, BATCH_SIZE);

  // Group by type and operation
  const grouped = groupSyncItems(batch);

  try {
    // Send batch request
    const response = await fetch('/api/batch-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify(grouped)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result = await response.json();

    // Notify success
    self.postMessage({
      type: 'SYNC_COMPLETED',
      payload: {
        ids: batch.map(item => item.id),
        result
      }
    });

    // Continue with remaining items
    if (syncQueue.length > 0) {
      setTimeout(() => flushSyncQueue(), 1000);
    }

  } catch (error) {
    console.error('Sync error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Retry logic
    const retryableItems = batch.filter(item => {
      item.retryCount++;
      return item.retryCount < MAX_RETRY_COUNT;
    });

    if (retryableItems.length > 0) {
      // Add back to queue with delay
      const retryDelay = RETRY_DELAYS[retryableItems[0].retryCount - 1] || 30000;

      setTimeout(() => {
        syncQueue.unshift(...retryableItems);
        flushSyncQueue();
      }, retryDelay);
    }

    // Notify failure for non-retryable items
    const failedItems = batch.filter(item => item.retryCount >= MAX_RETRY_COUNT);
    if (failedItems.length > 0) {
      self.postMessage({
        type: 'SYNC_FAILED',
        payload: {
          ids: failedItems.map(item => item.id),
          error: errorMessage
        }
      });
    }
  }
}

// Group sync items by type and operation
function groupSyncItems(items: SyncItem[]): BatchSyncRequest {
  const grouped: BatchSyncRequest = {
    notes: [],
    pageNotes: [],
    files: [],
    deletions: []
  };

  // Use Map to merge updates for same entity
  const noteUpdates = new Map<string, any>();
  const pageNoteUpdates = new Map<string, any>();

  for (const item of items) {
    if (item.operation === 'delete') {
      grouped.deletions!.push({
        type: item.type,
        id: item.data.id
      });
      continue;
    }

    switch (item.type) {
      case 'note':
        // Merge multiple updates for same note
        const existingNote = noteUpdates.get(item.data.id);
        if (existingNote) {
          // Merge with newer timestamp winning
          noteUpdates.set(item.data.id, {
            ...existingNote,
            ...item.data,
            updatedAt: Math.max(existingNote.updatedAt, item.data.updatedAt)
          });
        } else {
          noteUpdates.set(item.data.id, item.data);
        }
        break;

      case 'pageNote':
        const pageKey = `${item.data.noteId}-${item.data.fileId}-${item.data.pageNumber}`;
        const existingPage = pageNoteUpdates.get(pageKey);
        if (existingPage) {
          pageNoteUpdates.set(pageKey, {
            ...existingPage,
            ...item.data,
            updatedAt: Math.max(existingPage.updatedAt || 0, item.data.updatedAt || 0)
          });
        } else {
          pageNoteUpdates.set(pageKey, item.data);
        }
        break;

      case 'file':
        grouped.files!.push(item.data);
        break;
    }
  }

  // Convert Maps to arrays
  grouped.notes = Array.from(noteUpdates.values());
  grouped.pageNotes = Array.from(pageNoteUpdates.values());

  return grouped;
}

// Get auth token (simplified for now)
async function getAuthToken(): Promise<string> {
  // In a real implementation, this would securely get the token
  // For now, we'll use a placeholder
  return 'token-placeholder';
}

// Listen for online/offline events
self.addEventListener('online', () => {
  isOnline = true;
  flushSyncQueue();
});

self.addEventListener('offline', () => {
  isOnline = false;
});

// Periodic sync (every 30 seconds if queue not empty)
setInterval(() => {
  if (syncQueue.length > 0 && isOnline) {
    flushSyncQueue();
  }
}, 30000);

// Export for TypeScript
export {};