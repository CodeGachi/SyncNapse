/**
 * Sync Utilities
 * IndexedDB와 서버 간 데이터 동기화 유틸리티
 */

import type { Folder } from "@/lib/types";
import type { Note } from "@/lib/types";

/**
 * 폴더 동기화 - 서버 데이터가 더 최신이면 업데이트, 서버에 없으면 삭제
 */
export async function syncFolders(
  localFolders: Folder[],
  serverFolders: Folder[]
): Promise<{ toUpdate: Folder[]; toAdd: Folder[]; toDelete: string[] }> {
  const toUpdate: Folder[] = [];
  const toAdd: Folder[] = [];
  const toDelete: string[] = [];

  const localMap = new Map(localFolders.map(f => [f.id, f]));
  const serverMap = new Map(serverFolders.map(f => [f.id, f]));

  // Check server folders for updates or additions
  for (const serverFolder of serverFolders) {
    const localFolder = localMap.get(serverFolder.id);

    if (!localFolder) {
      // 서버에만 있음 → 추가
      toAdd.push(serverFolder);
    } else if (serverFolder.updatedAt > localFolder.updatedAt) {
      // 서버가 더 최신 → 업데이트
      toUpdate.push(serverFolder);
    }
  }

  // Check local folders for deletions (exist locally but not on server)
  for (const localFolder of localFolders) {
    if (!serverMap.has(localFolder.id)) {
      // 로컬에만 있음 → 서버에서 삭제됨 → 로컬에서도 삭제
      toDelete.push(localFolder.id);
    }
  }

  return { toUpdate, toAdd, toDelete };
}

/**
 * 노트 동기화 - 서버 데이터가 더 최신이면 업데이트, 서버에 없으면 삭제
 */
export async function syncNotes(
  localNotes: Note[],
  serverNotes: Note[]
): Promise<{ toUpdate: Note[]; toAdd: Note[]; toDelete: string[] }> {
  const toUpdate: Note[] = [];
  const toAdd: Note[] = [];
  const toDelete: string[] = [];

  const localMap = new Map(localNotes.map(n => [n.id, n]));
  const serverMap = new Map(serverNotes.map(n => [n.id, n]));

  // Check server notes for updates or additions
  for (const serverNote of serverNotes) {
    const localNote = localMap.get(serverNote.id);

    if (!localNote) {
      // 서버에만 있음 → 추가
      toAdd.push(serverNote);
    } else if (serverNote.updatedAt > localNote.updatedAt) {
      // 서버가 더 최신 → 업데이트
      toUpdate.push(serverNote);
    }
  }

  // Check local notes for deletions (exist locally but not on server)
  for (const localNote of localNotes) {
    if (!serverMap.has(localNote.id)) {
      // 로컬에만 있음 → 서버에서 삭제됨 → 로컬에서도 삭제
      toDelete.push(localNote.id);
    }
  }

  return { toUpdate, toAdd, toDelete };
}

/**
 * 타임스탬프를 Date로 변환
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * ISO 문자열을 타임스탬프로 변환
 */
export function isoToTimestamp(isoString: string): number {
  return new Date(isoString).getTime();
}

/**
 * 제네릭 동기화 유틸리티
 * 두 배열을 비교하여 추가/업데이트/삭제 대상 분리
 */
export interface SyncResult<T> {
  toUpdate: T[];
  toAdd: T[];
  toDelete: string[];
}

export interface SyncableEntity {
  id: string;
  updatedAt: number;
}

/**
 * 제네릭 엔티티 동기화
 * @param localItems 로컬 데이터
 * @param serverItems 서버 데이터
 * @returns 추가/업데이트/삭제 대상
 */
export function syncEntities<T extends SyncableEntity>(
  localItems: T[],
  serverItems: T[]
): SyncResult<T> {
  const toUpdate: T[] = [];
  const toAdd: T[] = [];
  const toDelete: string[] = [];

  const localMap = new Map(localItems.map((item) => [item.id, item]));
  const serverMap = new Map(serverItems.map((item) => [item.id, item]));

  // 서버 아이템 확인: 추가 또는 업데이트
  for (const serverItem of serverItems) {
    const localItem = localMap.get(serverItem.id);

    if (!localItem) {
      toAdd.push(serverItem);
    } else if (serverItem.updatedAt > localItem.updatedAt) {
      toUpdate.push(serverItem);
    }
  }

  // 로컬 아이템 확인: 서버에 없으면 삭제
  for (const localItem of localItems) {
    if (!serverMap.has(localItem.id)) {
      toDelete.push(localItem.id);
    }
  }

  return { toUpdate, toAdd, toDelete };
}
