/**
 * 최근 사용 노트 섹션 컴포넌트
 * 최근 수정된 노트들을 표시
 */

"use client";

import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/api/queries/notes.queries";

export function RecentUsedSection() {
  const router = useRouter();
  const { data: allNotes = [], isLoading } = useNotes();

  // 최근 수정된 순으로 정렬하고 상위 6개만 선택
  const recentNotes = [...allNotes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Recent</h2>
        <div className="text-gray-400">Loading...</div>
      </section>
    );
  }

  if (recentNotes.length === 0) {
    return (
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Recent</h2>
        <div className="text-gray-400 text-center py-12 bg-[#2F2F2F] rounded-xl">
          No notes yet. Click &quot;Create New&quot; to get started!
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6">Recent</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {recentNotes.map((note) => (
          <button
            key={note.id}
            onClick={() => router.push(`/note?id=${note.id}`)}
            className="bg-[#2F2F2F] hover:bg-[#3C3C3C] rounded-xl p-6 h-[180px] min-w-[280px] transition-colors text-left flex flex-col justify-between group flex-shrink-0"
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
    </section>
  );
}
