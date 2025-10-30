/**
 * 폴더 구조 섹션 컴포넌트
 * 선택된 폴더의 하위 폴더와 노트들을 표시
 */

"use client";

import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useFolders } from "@/features/dashboard/use-folders";
import type { DBFolder } from "@/lib/db/folders";

interface FolderStructureSectionProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function FolderStructureSection({
  selectedFolderId,
  onSelectFolder,
}: FolderStructureSectionProps) {
  const router = useRouter();
  const { folders } = useFolders();
  const { data: notes = [], isLoading: notesLoading } = useNotes(
    selectedFolderId ? { folderId: selectedFolderId } : { folderId: "root" }
  );

  // 선택된 폴더의 하위 폴더들 가져오기
  const subFolders = folders.filter((folder) => {
    if (selectedFolderId === null) {
      // Root가 선택되었을 때: parentId가 null인 폴더들
      return folder.parentId === null;
    } else {
      // 특정 폴더가 선택되었을 때: 해당 폴더의 하위 폴더들
      return folder.parentId === selectedFolderId;
    }
  });

  // 선택된 폴더의 노트 개수
  const noteCount = notes.length;

  // 폴더 경로 (breadcrumb)를 가져오기
  const getFolderPath = (): DBFolder[] => {
    if (selectedFolderId === null) return [];

    const path: DBFolder[] = [];
    let currentId: string | null = selectedFolderId;

    while (currentId !== null) {
      const folder = folders.find((f) => f.id === currentId);
      if (!folder) break;
      path.unshift(folder);
      currentId = folder.parentId;
    }

    return path;
  };

  const folderPath = getFolderPath();

  // 폴더의 노트 개수 계산 (하위 폴더 포함)
  const getFolderNoteCount = (folderId: string): number => {
    // 직접적인 노트들 가져오기 - 비동기이므로 현재는 단순히 표시만
    return 0; // 실제로는 각 폴더별로 노트 개수를 계산해야 하지만, 성능상 생략
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <section className="mb-12">
      {/* 헤더와 Breadcrumb */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-3">
          {selectedFolderId === null ? "All Folders" : "Current Location"}
        </h2>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => onSelectFolder(null)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedFolderId === null
                ? "bg-[#6B7B3E] text-white"
                : "text-gray-400 hover:text-white hover:bg-[#2F2F2F]"
            }`}
          >
            Root
          </button>

          {folderPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <span className="text-gray-500">/</span>
              <button
                onClick={() => onSelectFolder(folder.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  index === folderPath.length - 1
                    ? "bg-[#6B7B3E] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#2F2F2F]"
                }`}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 폴더와 노트 그리드 */}
      {subFolders.length === 0 && notes.length === 0 ? (
        <div className="text-gray-400 text-center py-12 bg-[#2F2F2F] rounded-xl">
          This folder is empty. Create a new note or folder to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* 하위 폴더들 */}
          {subFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className="bg-[#2F2F2F] hover:bg-[#3C3C3C] rounded-xl p-6 h-[140px] transition-colors text-left flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-[#3C3C3C] group-hover:bg-[#4A4A4A] rounded-lg flex items-center justify-center text-2xl transition-colors">
                  📁
                </div>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1 truncate">
                  {folder.name}
                </h3>
                <p className="text-gray-400 text-sm">
                  {formatDate(folder.updatedAt)}
                </p>
              </div>
            </button>
          ))}

          {/* 노트들 */}
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => router.push(`/note?id=${note.id}`)}
              className="bg-[#2F2F2F] hover:bg-[#3C3C3C] rounded-xl p-6 h-[140px] transition-colors text-left flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-[#3C3C3C] group-hover:bg-[#4A4A4A] rounded-lg flex items-center justify-center text-xl transition-colors">
                  📄
                </div>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">
                  {note.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {formatDate(note.updatedAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
