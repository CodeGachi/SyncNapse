/**
 * Trash API Client 
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
 * Trash all Item Import 
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
 * Trash Item Restore 
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
 * Trash Permanent Delete
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
 * onlylete Item Auto Delete 
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
 * Trash Empty (all Item Permanent Delete) 
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
