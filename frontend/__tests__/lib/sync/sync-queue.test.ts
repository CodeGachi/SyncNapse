/**
 * sync-queue 테스트
 * 동기화 대기 큐 관리
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initialSyncQueue,
  loadSyncQueue,
  saveSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
  incrementRetryCount,
  removeFailedItems,
  updateLastSyncTime,
  updateSyncStatus,
  getSyncQueue,
  type SyncQueue,
  type SyncQueueItem,
} from "@/lib/sync/sync-queue";

describe("sync-queue", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialSyncQueue", () => {
    it("초기 상태 확인", () => {
      expect(initialSyncQueue).toEqual({
        items: [],
        lastSyncTime: 0,
        syncStatus: "idle",
      });
    });
  });

  describe("loadSyncQueue", () => {
    it("localStorage에 데이터가 없으면 초기 상태 반환", () => {
      const result = loadSyncQueue();

      expect(result).toEqual(initialSyncQueue);
    });

    it("localStorage에서 큐 로드", () => {
      const storedQueue = {
        items: [
          {
            id: "note-1-123",
            entityType: "note",
            entityId: "1",
            operation: "create",
            timestamp: 1000,
            retryCount: 0,
          },
        ],
        lastSyncTime: 5000,
        syncStatus: "syncing",
      };
      localStorage.setItem("sync-queue", JSON.stringify(storedQueue));

      const result = loadSyncQueue();

      expect(result.items).toHaveLength(1);
      expect(result.lastSyncTime).toBe(5000);
      expect(result.syncStatus).toBe("idle"); // 항상 idle로 시작
    });

    it("잘못된 JSON은 초기 상태 반환", () => {
      localStorage.setItem("sync-queue", "invalid json");

      const result = loadSyncQueue();

      expect(result).toEqual(initialSyncQueue);
    });
  });

  describe("saveSyncQueue", () => {
    it("큐를 localStorage에 저장", () => {
      const queue: SyncQueue = {
        items: [
          {
            id: "note-1-123",
            entityType: "note",
            entityId: "1",
            operation: "create",
            timestamp: 1000,
            retryCount: 0,
          },
        ],
        lastSyncTime: 5000,
        syncStatus: "idle",
      };

      saveSyncQueue(queue);

      const stored = JSON.parse(localStorage.getItem("sync-queue")!);
      expect(stored.items).toHaveLength(1);
      expect(stored.lastSyncTime).toBe(5000);
    });
  });

  describe("addToSyncQueue", () => {
    it("새 아이템 추가", () => {
      vi.setSystemTime(new Date(1704067200000));

      const queue = initialSyncQueue;
      const result = addToSyncQueue(queue, {
        entityType: "note",
        entityId: "note-1",
        operation: "create",
        data: { title: "Test" },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].entityType).toBe("note");
      expect(result.items[0].entityId).toBe("note-1");
      expect(result.items[0].operation).toBe("create");
      expect(result.items[0].retryCount).toBe(0);
      expect(result.items[0].timestamp).toBe(1704067200000);
    });

    it("같은 엔티티 중복 제거 (최신 것만 유지)", () => {
      vi.setSystemTime(new Date(1000));
      let queue = addToSyncQueue(initialSyncQueue, {
        entityType: "note",
        entityId: "note-1",
        operation: "create",
      });

      vi.setSystemTime(new Date(2000));
      queue = addToSyncQueue(queue, {
        entityType: "note",
        entityId: "note-1",
        operation: "update",
        data: { title: "Updated" },
      });

      expect(queue.items).toHaveLength(1);
      expect(queue.items[0].operation).toBe("update");
      expect(queue.items[0].timestamp).toBe(2000);
    });

    it("다른 엔티티는 별도 유지", () => {
      let queue = addToSyncQueue(initialSyncQueue, {
        entityType: "note",
        entityId: "note-1",
        operation: "create",
      });
      queue = addToSyncQueue(queue, {
        entityType: "folder",
        entityId: "folder-1",
        operation: "create",
      });

      expect(queue.items).toHaveLength(2);
    });
  });

  describe("removeFromSyncQueue", () => {
    it("아이템 제거", () => {
      const queue: SyncQueue = {
        items: [
          {
            id: "item-1",
            entityType: "note",
            entityId: "note-1",
            operation: "create",
            timestamp: 1000,
            retryCount: 0,
          },
          {
            id: "item-2",
            entityType: "folder",
            entityId: "folder-1",
            operation: "create",
            timestamp: 2000,
            retryCount: 0,
          },
        ],
        lastSyncTime: 0,
        syncStatus: "idle",
      };

      const result = removeFromSyncQueue(queue, "item-1");

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("item-2");
    });

    it("존재하지 않는 아이템 제거 시도", () => {
      const queue: SyncQueue = {
        items: [
          {
            id: "item-1",
            entityType: "note",
            entityId: "note-1",
            operation: "create",
            timestamp: 1000,
            retryCount: 0,
          },
        ],
        lastSyncTime: 0,
        syncStatus: "idle",
      };

      const result = removeFromSyncQueue(queue, "non-existent");

      expect(result.items).toHaveLength(1);
    });
  });

  describe("incrementRetryCount", () => {
    it("재시도 횟수 증가", () => {
      const queue: SyncQueue = {
        items: [
          {
            id: "item-1",
            entityType: "note",
            entityId: "note-1",
            operation: "create",
            timestamp: 1000,
            retryCount: 0,
          },
        ],
        lastSyncTime: 0,
        syncStatus: "idle",
      };

      const result = incrementRetryCount(queue, "item-1", "Network error");

      expect(result.items[0].retryCount).toBe(1);
      expect(result.items[0].lastError).toBe("Network error");
    });

    it("여러 번 재시도", () => {
      let queue: SyncQueue = {
        items: [
          {
            id: "item-1",
            entityType: "note",
            entityId: "note-1",
            operation: "create",
            timestamp: 1000,
            retryCount: 0,
          },
        ],
        lastSyncTime: 0,
        syncStatus: "idle",
      };

      queue = incrementRetryCount(queue, "item-1", "Error 1");
      queue = incrementRetryCount(queue, "item-1", "Error 2");
      queue = incrementRetryCount(queue, "item-1", "Error 3");

      expect(queue.items[0].retryCount).toBe(3);
      expect(queue.items[0].lastError).toBe("Error 3");
    });
  });

  describe("removeFailedItems", () => {
    it("재시도 횟수 초과 아이템 제거", () => {
      const queue: SyncQueue = {
        items: [
          {
            id: "item-1",
            entityType: "note",
            entityId: "note-1",
            operation: "create",
            timestamp: 1000,
            retryCount: 3,
            lastError: "Failed",
          },
          {
            id: "item-2",
            entityType: "folder",
            entityId: "folder-1",
            operation: "create",
            timestamp: 2000,
            retryCount: 1,
          },
        ],
        lastSyncTime: 0,
        syncStatus: "idle",
      };

      const result = removeFailedItems(queue, 3);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("item-2");
    });

    it("기본 maxRetries는 3", () => {
      const queue: SyncQueue = {
        items: [
          {
            id: "item-1",
            entityType: "note",
            entityId: "note-1",
            operation: "create",
            timestamp: 1000,
            retryCount: 3,
          },
        ],
        lastSyncTime: 0,
        syncStatus: "idle",
      };

      const result = removeFailedItems(queue);

      expect(result.items).toHaveLength(0);
    });

    it("커스텀 maxRetries", () => {
      const queue: SyncQueue = {
        items: [
          {
            id: "item-1",
            entityType: "note",
            entityId: "note-1",
            operation: "create",
            timestamp: 1000,
            retryCount: 5,
          },
        ],
        lastSyncTime: 0,
        syncStatus: "idle",
      };

      const result = removeFailedItems(queue, 10);

      expect(result.items).toHaveLength(1);
    });
  });

  describe("updateLastSyncTime", () => {
    it("마지막 동기화 시간 업데이트", () => {
      vi.setSystemTime(new Date(1704067200000));

      const result = updateLastSyncTime(initialSyncQueue);

      expect(result.lastSyncTime).toBe(1704067200000);
    });
  });

  describe("updateSyncStatus", () => {
    it("상태를 syncing으로 변경", () => {
      const result = updateSyncStatus(initialSyncQueue, "syncing");

      expect(result.syncStatus).toBe("syncing");
    });

    it("상태를 error로 변경", () => {
      const result = updateSyncStatus(initialSyncQueue, "error");

      expect(result.syncStatus).toBe("error");
    });

    it("상태를 idle로 변경", () => {
      const queue = updateSyncStatus(initialSyncQueue, "syncing");
      const result = updateSyncStatus(queue, "idle");

      expect(result.syncStatus).toBe("idle");
    });
  });

  describe("getSyncQueue", () => {
    it("loadSyncQueue와 동일한 결과 반환", () => {
      const storedQueue = {
        items: [
          {
            id: "note-1-123",
            entityType: "note",
            entityId: "1",
            operation: "create",
            timestamp: 1000,
            retryCount: 0,
          },
        ],
        lastSyncTime: 5000,
      };
      localStorage.setItem("sync-queue", JSON.stringify(storedQueue));

      const result = getSyncQueue();
      const expected = loadSyncQueue();

      expect(result).toEqual(expected);
    });
  });

  describe("엔티티 타입", () => {
    it("모든 엔티티 타입 처리", () => {
      const entityTypes = [
        "note",
        "folder",
        "file",
        "recording",
        "noteContent",
        "question",
        "answer",
        "trash",
      ] as const;

      let queue = initialSyncQueue;
      entityTypes.forEach((entityType, index) => {
        queue = addToSyncQueue(queue, {
          entityType,
          entityId: `id-${index}`,
          operation: "create",
        });
      });

      expect(queue.items).toHaveLength(entityTypes.length);
    });
  });

  describe("작업 타입", () => {
    it("모든 작업 타입 처리", () => {
      const operations = [
        "create",
        "update",
        "delete",
        "restore",
        "cleanup",
        "empty",
      ] as const;

      let queue = initialSyncQueue;
      operations.forEach((operation, index) => {
        queue = addToSyncQueue(queue, {
          entityType: "note",
          entityId: `note-${index}`,
          operation,
        });
      });

      expect(queue.items).toHaveLength(operations.length);
    });
  });
});
