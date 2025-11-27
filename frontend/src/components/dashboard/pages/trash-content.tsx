/**
 * Trash Content Component (Client Component)
 * Trashed notes management and restoration
 */

"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchTrashedNotes, restoreNote, permanentlyDeleteNote } from "@/lib/api/services/notes.api";
import type { Note } from "@/lib/types";
import { Trash2, RotateCcw, Clock, X } from "lucide-react";

export function TrashContent() {
  const queryClient = useQueryClient();
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadTrashedNotes();
  }, []);

  const loadTrashedNotes = async () => {
    try {
      setIsLoading(true);
      // console.log('[TrashContent] Loading trashed notes...');
      const notes = await fetchTrashedNotes();
      // console.log('[TrashContent] Loaded:', notes.length, 'notes');
      setTrashedNotes(notes);
    } catch (error) {
      console.error('[TrashContent] Failed to load:', error);
      alert('휴지통 로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (noteId: string, noteTitle: string) => {
    if (restoring || deleting) return; // Prevent multiple clicks

    const confirmed = confirm(`"${noteTitle}" 노트를 복구하시겠습니까?\n타임스탬프가 포함된 이름으로 복구됩니다.`);
    if (!confirmed) return;

    try {
      setRestoring(noteId);
      // console.log('[TrashContent] Restoring note:', noteId);
      
      const result = await restoreNote(noteId);
      // console.log('[TrashContent] Restore result:', result);
      
      alert(`복구되었습니다!\n새 이름: ${result.title || noteTitle}`);
      
      // Invalidate queries to refresh all note lists
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      
      // Reload trashed notes list
      await loadTrashedNotes();
    } catch (error) {
      console.error('[TrashContent] Restore failed:', error);
      alert('복구에 실패했습니다.');
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (noteId: string, noteTitle: string) => {
    if (restoring || deleting) return; // Prevent multiple clicks

    const confirmed = confirm(
      `⚠️ 경고: "${noteTitle}" 노트를 영구적으로 삭제하시겠습니까?\n\n` +
      `이 작업은 되돌릴 수 없으며, 다음 항목들이 모두 삭제됩니다:\n` +
      `- 노트 콘텐츠\n` +
      `- 첨부 파일\n` +
      `- 관련 데이터\n\n` +
      `정말로 삭제하시겠습니까?`
    );
    
    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirmed = confirm(
      `정말로 "${noteTitle}"를 영구 삭제하시겠습니까?\n이 작업은 취소할 수 없습니다!`
    );
    
    if (!doubleConfirmed) return;

    try {
      setDeleting(noteId);
      // console.log('[TrashContent] Permanently deleting note:', noteId);
      
      await permanentlyDeleteNote(noteId);
      // console.log('[TrashContent] Permanent delete successful');
      
      alert('영구적으로 삭제되었습니다.');
      
      // Invalidate queries to refresh all note lists
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      
      // Reload trashed notes list
      await loadTrashedNotes();
    } catch (error) {
      console.error('[TrashContent] Permanent delete failed:', error);
      alert('삭제에 실패했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}일 전`;
    } else if (diffHours > 0) {
      return `${diffHours}시간 전`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}분 전`;
    } else {
      return '방금 전';
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-gray-400" />
            <h1 className="text-3xl font-bold text-white">휴지통</h1>
          </div>
          <div className="text-sm text-gray-400">
            {trashedNotes.length}개의 삭제된 노트
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>로딩 중...</span>
            </div>
          </div>
        ) : trashedNotes.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-[#2F2F2F] rounded-xl">
            <Trash2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              휴지통이 비어있습니다
            </h3>
            <p className="text-sm text-gray-500">
              삭제된 노트가 여기에 표시됩니다
            </p>
          </div>
        ) : (
          /* Trashed Notes List */
          <div className="space-y-3">
            {trashedNotes.map((note) => (
              <div
                key={note.id}
                className="bg-[#2F2F2F] hover:bg-[#353535] rounded-xl p-6 flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-[#3C3C3C] rounded-lg flex items-center justify-center text-2xl shrink-0">
                    📄
                  </div>

                  {/* Note Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg mb-1 truncate">
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(note.deletedAt)}
                      </span>
                      <span>•</span>
                      <span>{formatDate(note.deletedAt)}</span>
                      {note.folderName && (
                        <>
                          <span>•</span>
                          <span className="truncate">폴더: {note.folderName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleRestore(note.id, note.title)}
                    disabled={restoring === note.id || deleting === note.id}
                    className="px-4 py-2 bg-[#6B7B3E] hover:bg-[#7A8A4D] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    {restoring === note.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>복구 중...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>복구</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(note.id, note.title)}
                    disabled={restoring === note.id || deleting === note.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    {deleting === note.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>삭제 중...</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        <span>영구 삭제</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        {trashedNotes.length > 0 && (
          <div className="mt-8 space-y-3">
            <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
              <p className="text-sm text-blue-300">
                💡 복구 시 타임스탬프가 포함된 이름으로 복구됩니다. (예: &quot;노트이름_1731456789123&quot;)
              </p>
            </div>
            <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
              <p className="text-sm text-red-300">
                ⚠️ 영구 삭제는 되돌릴 수 없습니다. 노트, 파일, 콘텐츠가 완전히 삭제됩니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
