/**
 * sync-queue 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initialSyncQueue,
  loadSyncQueue,
  saveSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
} from "@/lib/sync/sync-queue";

describe("sync-queue", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("초기 상태 확인", () => {
    expect(initialSyncQueue).toEqual({ items: [], lastSyncTime: 0, syncStatus: "idle" });
  });

  it("localStorage 없으면 초기 상태 반환", () => {
    expect(loadSyncQueue()).toEqual(initialSyncQueue);
  });

  it("큐 저장 및 로드", () => {
    const queue = { items: [{ id: "1", type: "note", action: "create", data: {}, retryCount: 0, createdAt: Date.now() }], lastSyncTime: 1000, syncStatus: "idle" as const };
    saveSyncQueue(queue);
    expect(loadSyncQueue()).toEqual(queue);
  });

  it("아이템 추가 및 제거", () => {
    let queue = addToSyncQueue(initialSyncQueue, { type: "note", action: "create", data: {} });
    expect(queue.items).toHaveLength(1);
    queue = removeFromSyncQueue(queue, queue.items[0].id);
    expect(queue.items).toHaveLength(0);
  });
});
