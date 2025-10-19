/**
 * 노트 탭 관리 기능 훅
 * 파일 탭, 카테고리 관리
 */

"use client";

import { useState } from "react";

interface NoteFile {
  id: number;
  name: string;
}

export function useNoteTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeCategories, setActiveCategories] = useState<string[]>(["Notes"]);
  const [isExpanded, setIsExpanded] = useState(false);

  // 더미 파일 목록 (나중에 API로 대체)
  const files: NoteFile[] = [
    { id: 1, name: "자료1.pdf" },
    { id: 2, name: "자료2.pdf" },
    { id: 3, name: "자료3.pdf" },
    { id: 4, name: "자료4.pdf" },
  ];

  const handleTabChange = (index: number) => {
    setActiveTab(index);
  };

  const handleCategoryToggle = (category: string) => {
    setActiveCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  return {
    activeTab,
    activeCategories,
    files,
    isExpanded,
    handleTabChange,
    handleCategoryToggle,
    toggleExpand,
  };
}
