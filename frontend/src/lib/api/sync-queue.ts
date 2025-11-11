/**
 * Sync Queue Manager
 * 실패한 동기화 작업을 추적하고 재시도
 */

type SyncTask = {
  id: string;
  type: 'folder-create' | 'folder-update' | 'folder-delete' | 'folder-move' | 
        'note-create' | 'note-update' | 'note-delete' | 
        'file-upload';
  data: any;
  retryCount: number;
  maxRetries: number;
  nextRetry: number; // timestamp
  createdAt: number;
};

const SYNC_QUEUE_KEY = 'syncnapse-sync-queue';
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 5000; // 5초
const MAX_RETRY_DELAY = 300000; // 5분

class SyncQueueManager {
  private queue: SyncTask[] = [];
  private isProcessing = false;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadQueue();
    this.startRetryLoop();
  }

  /**
   * 큐에 작업 추가
   */
  addTask(type: SyncTask['type'], data: any, maxRetries = MAX_RETRIES) {
    const task: SyncTask = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      data,
      retryCount: 0,
      maxRetries,
      nextRetry: Date.now() + INITIAL_RETRY_DELAY,
      createdAt: Date.now(),
    };

    this.queue.push(task);
    this.saveQueue();
    console.log(`[SyncQueue] Task added:`, type, task.id);

    // 즉시 재시도 시작
    this.processQueue();
  }

  /**
   * 작업 성공 시 제거
   */
  removeTask(taskId: string) {
    this.queue = this.queue.filter(t => t.id !== taskId);
    this.saveQueue();
    console.log(`[SyncQueue] Task completed:`, taskId);
  }

  /**
   * 작업 실패 시 재시도 카운트 증가
   */
  private incrementRetry(taskId: string) {
    const task = this.queue.find(t => t.id === taskId);
    if (!task) return;

    task.retryCount++;
    
    // Exponential backoff: 5s, 10s, 20s, 40s, 80s, ...
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, task.retryCount),
      MAX_RETRY_DELAY
    );
    task.nextRetry = Date.now() + delay;

    if (task.retryCount >= task.maxRetries) {
      console.error(`[SyncQueue] Task failed after ${task.maxRetries} retries:`, taskId);
      this.removeTask(taskId);
    } else {
      console.warn(`[SyncQueue] Task retry ${task.retryCount}/${task.maxRetries} in ${delay}ms:`, taskId);
      this.saveQueue();
    }
  }

  /**
   * 큐 처리
   */
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const now = Date.now();
    const tasksToProcess = this.queue.filter(t => t.nextRetry <= now);

    for (const task of tasksToProcess) {
      try {
        await this.executeTask(task);
        this.removeTask(task.id);
      } catch (error) {
        console.error(`[SyncQueue] Task execution failed:`, task.id, error);
        this.incrementRetry(task.id);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 작업 실행
   */
  private async executeTask(task: SyncTask): Promise<void> {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    
    // JWT 토큰 가져오기
    const getAuthHeaders = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null;
      return token ? { Authorization: `Bearer ${token}` } : {};
    };

    console.log(`[SyncQueue] Executing task:`, task.type, task.id);

    switch (task.type) {
      case 'folder-create': {
        const res = await fetch(`${API_BASE_URL}/api/folders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          } as HeadersInit,
          credentials: "include",
          body: JSON.stringify(task.data),
        });
        if (!res.ok) throw new Error("Failed to sync folder creation");
        break;
      }

      case 'folder-update': {
        const res = await fetch(`${API_BASE_URL}/api/folders/${task.data.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          } as HeadersInit,
          credentials: "include",
          body: JSON.stringify(task.data.updates),
        });
        if (!res.ok) throw new Error("Failed to sync folder update");
        break;
      }

      case 'folder-delete': {
        const res = await fetch(`${API_BASE_URL}/api/folders/${task.data.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: getAuthHeaders() as HeadersInit,
        });
        if (!res.ok) throw new Error("Failed to sync folder deletion");
        break;
      }

      case 'folder-move': {
        const res = await fetch(`${API_BASE_URL}/api/folders/${task.data.id}/move`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          } as HeadersInit,
          credentials: "include",
          body: JSON.stringify({ parentId: task.data.newParentId }),
        });
        if (!res.ok) throw new Error("Failed to sync folder move");
        break;
      }

      case 'note-create': {
        // Get actual folder ID from IndexedDB (in case it was updated)
        let actualFolderId = task.data.folderId;
        try {
          const { getFolder } = await import("@/lib/db/folders");
          const folder = await getFolder(task.data.folderId);
          if (folder) {
            actualFolderId = folder.id;
            console.log(`[SyncQueue] Using actual folder ID from IndexedDB: ${actualFolderId}`);
          }
        } catch (error) {
          console.warn("[SyncQueue] Could not get folder from IndexedDB, using original ID:", error);
        }

        const formData = new FormData();
        formData.append("title", task.data.title);
        formData.append("folder_id", actualFolderId);
        task.data.files?.forEach((file: File) => formData.append("files", file));

        const res = await fetch(`${API_BASE_URL}/api/notes`, {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders() as HeadersInit,
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to sync note creation");
        break;
      }

      case 'note-update': {
        const res = await fetch(`${API_BASE_URL}/api/notes/${task.data.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          } as HeadersInit,
          credentials: "include",
          body: JSON.stringify(task.data.updates),
        });
        if (!res.ok) throw new Error("Failed to sync note update");
        break;
      }

      case 'note-delete': {
        const res = await fetch(`${API_BASE_URL}/api/notes/${task.data.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: getAuthHeaders() as HeadersInit,
        });
        if (!res.ok) throw new Error("Failed to sync note deletion");
        break;
      }

      case 'file-upload': {
        const formData = new FormData();
        task.data.files?.forEach((file: File) => formData.append("files", file));

        const res = await fetch(`${API_BASE_URL}/api/notes/${task.data.noteId}/files/batch`, {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders() as HeadersInit,
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to sync file upload");
        break;
      }

      default:
        console.error(`[SyncQueue] Unknown task type:`, task.type);
    }
  }

  /**
   * 주기적 재시도 루프
   */
  private startRetryLoop() {
    this.retryTimer = setInterval(() => {
      this.processQueue();
    }, 10000); // 10초마다 체크
  }

  /**
   * 큐 저장
   */
  private saveQueue() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[SyncQueue] Failed to save queue:', error);
    }
  }

  /**
   * 큐 로드
   */
  private loadQueue() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(SYNC_QUEUE_KEY);
      if (saved) {
        this.queue = JSON.parse(saved);
        console.log(`[SyncQueue] Loaded ${this.queue.length} pending tasks`);
      }
    } catch (error) {
      console.error('[SyncQueue] Failed to load queue:', error);
    }
  }

  /**
   * 대기 중인 작업 수
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * 큐 상태
   */
  getStatus() {
    return {
      pending: this.queue.length,
      tasks: this.queue.map(t => ({
        type: t.type,
        retryCount: t.retryCount,
        nextRetry: new Date(t.nextRetry),
      })),
    };
  }
}

// Singleton instance
let syncQueueInstance: SyncQueueManager | null = null;

export function getSyncQueue(): SyncQueueManager {
  if (!syncQueueInstance && typeof window !== 'undefined') {
    syncQueueInstance = new SyncQueueManager();
  }
  return syncQueueInstance!;
}

