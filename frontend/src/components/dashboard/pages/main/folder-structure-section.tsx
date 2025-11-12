/**
 * 폴더 구조 섹션 컴포넌트
 * 선택된 폴더의 하위 폴더와 노트들을 표시
 */

"use client";

import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useFolderStructureSection } from "@/features/dashboard";

interface FolderStructureSectionProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function FolderStructureSection({
  selectedFolderId,
  onSelectFolder,
}: FolderStructureSectionProps) {
  const router = useRouter();
  const { subFolders, folderPath, formatDate } = useFolderStructureSection({
    selectedFolderId,
  });
  const { data: notes = [], isLoading: notesLoading } = useNotes(
    selectedFolderId ? { folderId: selectedFolderId } : { folderId: "root" }
  );

  // Debug logs
  console.log('[FolderStructureSection] Current state:', {
    selectedFolderId,
    notesCount: notes.length,
    notes: notes.map(n => ({ id: n.id, title: n.title, folderId: n.folderId })),
    isLoading: notesLoading,
    subFoldersCount: subFolders.length
  });

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
          {notes.map((note) => {
            const noteType = note.type || "student";
            const notePath = noteType === "educator" ? `/note/educator/${note.id}` : `/note/student/${note.id}`;

            return (
            <button
              key={note.id}
              onClick={() => router.push(notePath)}
              className="bg-[#2F2F2F] hover:bg-[#3C3C3C] rounded-xl p-6 h-[140px] transition-colors text-left flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-[#3C3C3C] group-hover:bg-[#4A4A4A] rounded-lg flex items-center justify-center text-xl transition-colors">
                  📄
                </div>
                {/* 노트 타입 배지 */}
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  note.type === "educator"
                    ? "bg-[#AFC02B] text-[#1E1E1E]"
                    : "bg-[#4C4C4C] text-gray-300"
                }`}>
                  {note.type === "educator" ? "강의" : "개인"}
                </span>
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
          );
          })}
        </div>
      )}
    </section>
  );
}
