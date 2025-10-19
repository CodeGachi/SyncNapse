"use client";

import { useState } from "react";

export function TagSection() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // TODO: 나중에 API에서 태그 데이터 가져오기
  const tags: string[] = [];

  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6">태그</h2>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedTag === tag
                ? "bg-[#6B7B3E] text-white"
                : "bg-[#2F2F2F] text-white hover:bg-[#3C3C3C]"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </section>
  );
}
