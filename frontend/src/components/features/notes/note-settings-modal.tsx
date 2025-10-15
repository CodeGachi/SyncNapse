"use client";

import { useState, useRef } from "react";

interface NoteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File) => void;
}

interface UploadedFile {
  file: File;
  progress: number;
  status: "uploading" | "completed";
}

export function NoteSettingsModal({
  isOpen,
  onClose,
  onSubmit,
}: NoteSettingsModalProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => addFile(file));
  };

  const addFile = (file: File) => {
    const newFile: UploadedFile = {
      file,
      progress: 0,
      status: "uploading",
    };
    setUploadedFiles((prev) => [...prev, newFile]);

    // 업로드 시뮬레이션
    const interval = setInterval(() => {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? {
                ...f,
                progress: Math.min(f.progress + 10, 100),
                status: f.progress >= 90 ? "completed" : "uploading",
              }
            : f
        )
      );
    }, 200);

    setTimeout(() => clearInterval(interval), 2000);
  };

  const removeFile = (file: File) => {
    setUploadedFiles((prev) => prev.filter((f) => f.file !== file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => addFile(file));
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = () => {
    uploadedFiles.forEach((uf) => onSubmit(uf.file));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[896px] bg-[#3C3C3C] rounded-2xl shadow-2xl p-8 flex flex-col gap-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-[30px] font-bold text-white leading-9">
              파일 업로드
            </h2>
            <p className="text-base text-white mt-2">
              문서, 이미지, 비디오 파일을 업로드하세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-white transition-colors"
          >
            <svg
              width="18"
              height="24"
              viewBox="0 0 18 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L17 23M17 1L1 23"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 업로드 영역 */}
        <div
          className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
            isDragActive
              ? "border-[#AFC02B] bg-[#4A4A4A]"
              : "border-[#B9B9B9] bg-[#575757]"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleSelectClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.png,.mp4,.mov"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 업로드 아이콘 */}
          <svg
            width="75"
            height="60"
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

          <h3 className="text-xl font-semibold text-white text-center">
            파일을 드래그하여 놓거나 클릭하여 선택하세요
          </h3>

          <p className="text-base text-[#B9B9B9] text-center">
            최대 100MB까지 업로드 가능합니다
          </p>

          <button
            type="button"
            className="bg-[#AFC02B] text-white px-[18px] py-[10px] rounded-lg font-medium text-base hover:bg-[#9DB025] transition-colors"
          >
            파일 선택
          </button>
        </div>

        {/* 업로드된 파일 목록 */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-white">업로드된 파일</h3>
            <div className="flex flex-col gap-3 max-h-[208px] overflow-y-auto pr-2">
              {uploadedFiles.map((uf, index) => (
                <div
                  key={index}
                  className="bg-[#575757] rounded-lg p-6 flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    {/* 파일 아이콘 */}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 2L6 18M6 2L14 2L18 6L18 18L6 18"
                        stroke={
                          uf.status === "completed" ? "#22C55E" : "#EF4444"
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <div>
                      <p className="text-base font-medium text-white">
                        {uf.file.name}
                      </p>
                      <p className="text-sm text-[#B9B9B9]">
                        {(uf.file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* 진행률 바 */}
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            uf.status === "completed"
                              ? "bg-[#22C55E]"
                              : "bg-[#3B82F6]"
                          }`}
                          style={{ width: `${uf.progress}%` }}
                        />
                      </div>
                      <span
                        className={`text-base font-medium ${
                          uf.status === "completed"
                            ? "text-[#16A34A]"
                            : "text-[#2563EB]"
                        }`}
                      >
                        {uf.status === "completed" ? "완료" : `${uf.progress}%`}
                      </span>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => removeFile(uf.file)}
                      className="text-[#EF4444] hover:text-[#DC2626]"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 1L13 13M13 1L1 13"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 하단 */}
        <div className="flex justify-between items-center pt-4 border-t border-[#575757]">
          <div className="flex items-center gap-2 text-sm text-white">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="7" cy="7" r="6" stroke="#4B5563" strokeWidth="2" />
              <path
                d="M7 4V7L9 9"
                stroke="#4B5563"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>지원 형식: PDF, DOC, DOCX, JPG, PNG, MP4, MOV</span>
          </div>

          <div className="flex gap-7">
            <button
              onClick={onClose}
              className="px-5 py-[11px] bg-[#B9B9B9] text-[#374151] rounded-lg font-medium text-base hover:bg-[#A0A0A0] transition-colors border border-[#D1D5DB]"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploadedFiles.length === 0}
              className="px-[18px] py-[10px] bg-[#AFC02B] text-white rounded-lg font-medium text-base hover:bg-[#9DB025] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              업로드 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
