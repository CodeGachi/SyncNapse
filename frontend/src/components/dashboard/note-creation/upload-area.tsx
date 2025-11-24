/**
 * File upload area component
 * Provides drag-and-drop and file selection functionality
 */

"use client";

import { useRef } from "react";
import { FILE_CONSTRAINTS } from "@/lib/constants";

interface UploadAreaProps {
  isDragActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadArea({
  isDragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`flex-1 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
        isDragActive
          ? "border-[#AFC02B] bg-[#4A4A4A]"
          : "border-[#B9B9B9] bg-[#575757]"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.join(",")}
        onChange={onFileChange}
        className="hidden"
      />

      <svg
        width="50"
        height="40"
        viewBox="0 0 75 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M37.5 3.75L37.5 48.75M37.5 3.75L18.75 22.5M37.5 3.75L56.25 22.5M11.25 56.25H63.75"
          stroke="white"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <h3 className="text-base font-semibold text-white text-center">
        파일을 드래그하거나<br />클릭하여 선택
      </h3>

      <p className="text-sm text-[#B9B9B9] text-center">
        최대 100MB
      </p>

      <button
        type="button"
        className="bg-[#AFC02B] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#9DB025] transition-colors"
      >
        파일 선택
      </button>
    </div>
  );
}
