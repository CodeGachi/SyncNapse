/**
 * 휴지통 API 클라이언트
 */

import {
  getAllTrashItems as getAllTrashItemsFromDB,
  restoreFromTrash as restoreFromTrashDB,
  permanentlyDeleteFromTrash as permanentlyDeleteFromTrashDB,
  cleanupExpiredItems as cleanupExpiredItemsDB,
  emptyTrash as emptyTrashDB,
  type DBTrashItem,
} from "@/lib/db/trash";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * 휴지통의 모든 아이템 가져오기
 */
export async function fetchTrashItems(): Promise<DBTrashItem[]> {
  if (USE_LOCAL) {
    return await getAllTrashItemsFromDB();
  } else {
    const res = await fetch("/api/trash");
    if (!res.ok) throw new Error("Failed to fetch trash items");
    return await res.json();
  }
}

/**
 * 휴지통 아이템 복구
 */
export async function restoreTrashItem(itemId: string): Promise<void> {
  if (USE_LOCAL) {
    await restoreFromTrashDB(itemId);
  } else {
    const res = await fetch(`/api/trash/${itemId}/restore`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to restore item");
  }
}

/**
 * 휴지통에서 영구 삭제
 */
export async function permanentlyDeleteTrashItem(itemId: string): Promise<void> {
  if (USE_LOCAL) {
    await permanentlyDeleteFromTrashDB(itemId);
  } else {
    const res = await fetch(`/api/trash/${itemId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to permanently delete item");
  }
}

/**
 * 만료된 아이템 자동 삭제
 */
export async function cleanupExpiredTrashItems(): Promise<number> {
  if (USE_LOCAL) {
    return await cleanupExpiredItemsDB();
  } else {
    const res = await fetch("/api/trash/cleanup", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to cleanup expired items");
    const data = await res.json();
    return data.deletedCount;
  }
}

/**
 * 휴지통 비우기 (모든 아이템 영구 삭제)
 */
export async function emptyTrash(): Promise<void> {
  if (USE_LOCAL) {
    await emptyTrashDB();
  } else {
    const res = await fetch("/api/trash/empty", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to empty trash");
  }
}
