/**
 * Drawing Block Display Component
 * Displays saved drawings in the note panel alongside text blocks
 */

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getDrawing } from "@/lib/db/drawings";
import type { DrawingData } from "@/lib/types/drawing";

interface DrawingBlockDisplayProps {
  noteId: string;
  fileId: string;
  pageNum: number;
}

export function DrawingBlockDisplay({
  noteId,
  fileId,
  pageNum,
}: DrawingBlockDisplayProps) {
  const [drawing, setDrawing] = useState<DrawingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDrawing = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDrawing(noteId, fileId, pageNum);
        setDrawing(data || null);
      } catch (err) {
        console.error("Failed to load drawing:", err);
        setError("필기를 불러올 수 없습니다");
      } finally {
        setLoading(false);
      }
    };

    loadDrawing();
  }, [noteId, fileId, pageNum]);

  if (loading) {
    return (
      <div className="w-full p-3 bg-[#3a3a3a] rounded-md border border-[#555555] flex items-center justify-center min-h-[120px]">
        <span className="text-xs text-[#888888]">필기 로드 중...</span>
      </div>
    );
  }

  if (!drawing || !drawing.image) {
    return null; // Don't show anything if no drawing exists
  }

  return (
    <div className="w-full mb-2 p-2 bg-[#3a3a3a] rounded-md border border-[#555555] overflow-hidden">
      {/* Drawing label */}
      <div className="text-xs text-[#888888] mb-2 px-1">
        필기 ({drawing.canvas.width}x{drawing.canvas.height}px)
      </div>

      {/* Drawing image */}
      <div className="relative w-full bg-white rounded-sm overflow-auto max-h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={drawing.image}
          alt={`Drawing for page ${pageNum}`}
          className="w-full h-auto"
          style={{
            maxWidth: "100%",
            maxHeight: "300px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Drawing metadata */}
      <div className="text-xs text-[#666666] mt-1 px-1 flex justify-between">
        <span>
          {new Date(drawing.updatedAt).toLocaleString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
