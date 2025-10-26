"use client";

import { useRouter } from "next/navigation";

interface Folder {
  id: number;
  name: string;
  noteCount: number;
}

export function FolderSection() {
  const router = useRouter();

  const folders: Folder[] = [];

  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6">폴더</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => router.push(`/note`)}
            className="bg-[#2F2F2F] hover:bg-[#3C3C3C] rounded-xl p-6 h-[140px] transition-colors text-left flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-[#3C3C3C] group-hover:bg-[#4A4A4A] rounded-lg flex items-center justify-center text-2xl transition-colors">
                📁
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">
                {folder.name}
              </h3>
              <p className="text-gray-400 text-sm">
                {folder.noteCount}개의 노트
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
