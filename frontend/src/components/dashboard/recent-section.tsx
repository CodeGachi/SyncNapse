"use client";

import { useRouter } from "next/navigation";

interface Note {
  id: number;
  title: string;
  updatedAt: string;
}

export function RecentSection() {
  const router = useRouter();

  // TODO: 나중에 API에서 최근 노트 데이터 가져오기
  const notes: Note[] = [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "어제";
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6">최근 사용</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => router.push(`/note`)}
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
    </section>
  );
}
