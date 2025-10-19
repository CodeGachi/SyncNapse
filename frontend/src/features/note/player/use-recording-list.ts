/**
 * 녹음 목록 관리 훅
 */

"use client";

import { useState } from "react";

interface Recording {
  id: number;
  title: string;
  time: string;
  date: string;
  duration: string;
}

export function useRecordingList() {
  const [isExpanded, setIsExpanded] = useState(false);

  // 더미 녹음 목록
  const recordings: Recording[] = [
    {
      id: 1,
      title: "녹음(1)",
      time: "10:27 PM",
      date: "2025/10/04",
      duration: "2:33",
    },
    {
      id: 2,
      title: "녹음(2)",
      time: "10:27 PM",
      date: "2025/10/04",
      duration: "2:33",
    },
    {
      id: 3,
      title: "녹음(3)",
      time: "10:27 PM",
      date: "2025/10/04",
      duration: "2:33",
    },
  ];

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return {
    isExpanded,
    recordings,
    toggleExpanded,
  };
}
