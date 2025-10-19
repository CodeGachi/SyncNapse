/**
 * 노트 설정 모달 UI 컴포넌트 (프레젠테이셔널)
 * 비즈니스 로직은 features/note/use-note-settings.ts에 위치
 */

"use client";

import { FileConflictModal } from "@/components/common/file-conflict-modal";
import { FILE_CONSTRAINTS } from "@/lib/constants";
import { useNoteSettings } from "@/features/note";
import type { NoteData } from "@/lib/types";

interface NoteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteData: NoteData) => void;
}

export function NoteSettingsModal({
  isOpen,
  onClose,
  onSubmit,
}: NoteSettingsModalProps) {
  const {
    title,
    selectedLocation,
    uploadedFiles,
    selectedFileIndex,
    isDragActive,
    conflicts,
    showConflictModal,
    validationErrors,
    autoExtractZip,
    fileInputRef,
    folders,
    uploadQueue,
    storageUsage,
    setTitle,
    setSelectedLocation,
    setSelectedFileIndex,
    setValidationErrors,
    setAutoExtractZip,
    setShowConflictModal,
    handleFilesAdded,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleConflictResolve,
    handleSelectClick,
    reset,
    getNoteData,
  } = useNoteSettings();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFilesAdded(files);
  };

  const handleSubmit = () => {
    const noteData = getNoteData();
    onSubmit(noteData);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
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
              새 노트 만들기
            </h2>
            <p className="text-base text-white mt-2">
              노트 정보를 입력하고 파일을 업로드하세요
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

        {/* 검증 에러 표시 */}
        {validationErrors.length > 0 && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-400 mb-2">
                  파일 업로드 오류
                </h4>
                <ul className="text-sm text-red-300 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setValidationErrors([])}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 업로드 진행 상태 표시 */}
        {uploadQueue.stats.total > 0 && (
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm text-blue-300">
              <span>
                업로드 중: {uploadQueue.stats.uploading} / 완료:{" "}
                {uploadQueue.stats.completed} / 대기:{" "}
                {uploadQueue.stats.pending}
              </span>
              <span className="font-semibold">
                {uploadQueue.stats.totalProgress.toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* 저장 공간 사용량 표시 */}
        {storageUsage && (
          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">저장 공간 사용량</span>
              <span className="text-sm font-semibold text-gray-200">
                {storageUsage.totalGB.toFixed(2)} GB / {(FILE_CONSTRAINTS.MAX_TOTAL_SIZE / (1024 * 1024 * 1024)).toFixed(0)} GB
              </span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  storageUsage.usagePercentage > 90
                    ? "bg-red-500"
                    : storageUsage.usagePercentage > 70
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(storageUsage.usagePercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {storageUsage.usagePercentage.toFixed(1)}% 사용 중
            </div>
          </div>
        )}

        {/* 노트 설정 폼 - 한 줄로 */}
        <div className="flex gap-4">
          {/* 제목 입력 */}
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="노트 제목"
              className="w-full bg-[#575757] text-white px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#AFC02B] placeholder-gray-400 text-sm"
            />
          </div>

          {/* 저장 위치 선택 */}
          <div className="w-48">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-[#575757] text-white px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#AFC02B] cursor-pointer text-sm"
            >
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 컨텐츠 영역 - 파일 업로드 + 업로드된 파일 목록 */}
        <div className="flex gap-4 h-[300px]">
          {/* 파일 업로드 영역 */}
          <div
            className={`flex-1 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
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
              accept=".pdf,.doc,.docx,.jpg,.png,.mp4,.mov,.zip"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* 업로드 아이콘 */}
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

          {/* 업로드된 파일 목록 - 항상 표시 */}
          <div className="flex-1 flex flex-col gap-3 bg-[#2F2F2F] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white">
              업로드된 파일 ({uploadedFiles.length}개)
            </h3>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {uploadedFiles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  업로드된 파일이 없습니다
                </div>
              ) : (
                uploadedFiles.map((uf, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedFileIndex(index)}
                    className={`rounded-lg p-4 flex justify-between items-center cursor-pointer transition-colors ${
                      selectedFileIndex === index
                        ? "bg-[#AFC02B] bg-opacity-20 border-2 border-[#AFC02B]"
                        : "bg-[#575757] hover:bg-[#6A6A6A]"
                    }`}
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
                          uf.status === "completed"
                            ? "#22C55E"
                            : uf.status === "error"
                            ? "#EF4444"
                            : uf.status === "uploading"
                            ? "#3B82F6"
                            : "#9CA3AF"
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">
                        {uf.file.name}
                      </p>
                      <p className="text-xs text-[#B9B9B9]">
                        {(uf.file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                      {uf.error && (
                        <p className="text-xs text-red-400 mt-1">
                          {uf.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 상태별 UI */}
                    {uf.status === "uploading" ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all bg-[#3B82F6]"
                            style={{ width: `${uf.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[#2563EB]">
                          {uf.progress}%
                        </span>
                        {/* 취소 버튼 (업로드 중) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const queueFile = uploadQueue.queue.find(
                              (qf) =>
                                qf.file.name === uf.file.name &&
                                qf.file.size === uf.file.size
                            );
                            if (queueFile) {
                              uploadQueue.removeFile(queueFile.id);
                            }
                          }}
                          className="text-xs text-orange-400 hover:text-orange-300"
                          title="업로드 취소"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle
                              cx="7"
                              cy="7"
                              r="6"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M4 4L10 10M10 4L4 10"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : uf.status === "completed" ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all bg-[#22C55E]"
                            style={{ width: "100%" }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[#16A34A]">
                          완료
                        </span>
                      </div>
                    ) : uf.status === "error" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const queueFile = uploadQueue.queue.find(
                            (qf) =>
                              qf.file.name === uf.file.name &&
                              qf.file.size === uf.file.size
                          );
                          if (queueFile) {
                            uploadQueue.retryFile(queueFile.id);
                          }
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        재시도
                      </button>
                    ) : uf.status === "cancelled" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400">
                          취소됨
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const queueFile = uploadQueue.queue.find(
                              (qf) =>
                                qf.file.name === uf.file.name &&
                                qf.file.size === uf.file.size
                            );
                            if (queueFile) {
                              uploadQueue.retryFile(queueFile.id);
                            }
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          재시도
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-[#9CA3AF]">
                        대기 중
                      </span>
                    )}

                    {/* 삭제 버튼 (항상 표시) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(uf.file);
                        const queueFile = uploadQueue.queue.find(
                          (qf) =>
                            qf.file.name === uf.file.name &&
                            qf.file.size === uf.file.size
                        );
                        if (queueFile) {
                          uploadQueue.removeFile(queueFile.id);
                        }
                      }}
                      className="text-[#EF4444] hover:text-[#DC2626]"
                      title="목록에서 제거"
                    >
                      <svg
                        width="12"
                        height="12"
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
              ))
              )}
            </div>
          </div>
        </div>

        {/* 하단 */}
        <div className="flex justify-between items-center pt-4 border-t border-[#575757]">
          <div className="flex flex-col gap-2">
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
              <span>지원 형식: PDF, DOC, DOCX, JPG, PNG, MP4, MOV, ZIP</span>
            </div>
            {/* ZIP 자동 압축 해제 옵션 */}
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input
                type="checkbox"
                checked={autoExtractZip}
                onChange={(e) => setAutoExtractZip(e.target.checked)}
                className="w-4 h-4 accent-[#AFC02B]"
              />
              <span>ZIP 파일 자동 압축 해제 (실험적 기능)</span>
            </label>
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
              disabled={!title.trim()}
              className="px-[18px] py-[10px] bg-[#AFC02B] text-white rounded-lg font-medium text-base hover:bg-[#9DB025] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              노트 생성
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* 파일 충돌 모달 */}
    <FileConflictModal
      isOpen={showConflictModal}
      conflicts={conflicts}
      onResolve={handleConflictResolve}
      onCancel={() => {
        setShowConflictModal(false);
      }}
    />
    </>
  );
}
