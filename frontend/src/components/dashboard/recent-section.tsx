"use client";

import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/api/queries/notes.queries";

interface RecentSectionProps {
  folderId?: string | null;
}

export function RecentSection({ folderId }: RecentSectionProps) {
  const router = useRouter();
  const { data: notes = [], isLoading } = useNotes(
    folderId ? { folderId } : undefined
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "어제";
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  if (isLoading) {
    return (
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">최근 사용</h2>
        <div className="text-gray-400">로딩 중...</div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6">
        {folderId ? "폴더 노트" : "최근 사용"}
      </h2>
      {notes.length === 0 ? (
        <div className="text-gray-400 text-center py-12">
          노트가 없습니다. New Note 버튼을 눌러 노트를 만들어보세요!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => router.push(`/note?id=${note.id}`)}
              className="bg-[#2F2F2F] hover:bg-[#3C3C3C] rounded-xl p-6 h-[180px] transition-colors text-left flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 bg-[#3C3C3C] group-hover:bg-[#4A4A4A] rounded-lg flex items-center justify-center text-xl mb-4 transition-colors">
                  📄
                </div>
                <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                  {note.title}
                </h3>
              </div>
              <div>
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
