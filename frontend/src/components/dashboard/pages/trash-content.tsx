/**
 * Trash Content Component (Client Component)
 * Trash management and restoration
 */

"use client";

import { useEffect, useState } from "react";
import {
  fetchTrashItems,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
  emptyTrash,
  cleanupExpiredTrashItems,
} from "@/lib/api/services/trash.api";
import type { DBTrashItem } from "@/lib/db/trash";

export function TrashContent() {
  const [trashItems, setTrashItems] = useState<DBTrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrashItems();
    // 만료된 항목 자동 정리
    cleanupExpiredTrashItems();
  }, []);

  const loadTrashItems = async () => {
    try {
      setIsLoading(true);
      const items = await fetchTrashItems();
      setTrashItems(items);
    } catch (error) {
      console.error("Failed to load trash items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (itemId: string) => {
    try {
      await restoreTrashItem(itemId);
      await loadTrashItems();
      alert("복구되었습니다.");
    } catch (error) {
      alert("복구에 실패했습니다.");
    }
  };

  const handlePermanentlyDelete = async (itemId: string) => {
    const confirmed = confirm("영구적으로 삭제하시겠습니까? 복구할 수 없습니다.");
    if (!confirmed) return;

    try {
      await permanentlyDeleteTrashItem(itemId);
      await loadTrashItems();
      alert("영구 삭제되었습니다.");
    } catch (error) {
      alert("삭제에 실패했습니다.");
    }
  };

  const handleEmptyTrash = async () => {
    const confirmed = confirm(
      "휴지통을 비우시겠습니까? 모든 항목이 영구적으로 삭제됩니다."
    );
    if (!confirmed) return;

    try {
      await emptyTrash();
      await loadTrashItems();
      alert("휴지통이 비워졌습니다.");
    } catch (error) {
      alert("휴지통 비우기에 실패했습니다.");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysUntilExpire = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Trash</h1>
        {trashItems.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Empty Trash
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : trashItems.length === 0 ? (
        <div className="text-gray-400 text-center py-12 bg-[#2F2F2F] rounded-xl">
          Trash is empty
        </div>
      ) : (
        <div className="space-y-4">
          {trashItems.map((item) => {
            const daysLeft = getDaysUntilExpire(item.expiresAt);
            const data = item.data as any;

            return (
              <div
                key={item.id}
                className="bg-[#2F2F2F] rounded-xl p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#3C3C3C] rounded-lg flex items-center justify-center text-2xl">
                    {item.type === "folder" ? "📁" : "📄"}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {data.name || data.title}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Deleted: {formatDate(item.deletedAt)} •{" "}
                      {daysLeft > 0
                        ? `Expires in ${daysLeft} days`
                        : "Expired"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="px-4 py-2 bg-[#6B7B3E] hover:bg-[#7A8A4D] text-white rounded-lg transition-colors"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentlyDelete(item.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
