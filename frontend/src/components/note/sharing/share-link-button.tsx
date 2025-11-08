/**
 * 공유 링크 생성 버튼 컴포넌트
 *
 * Educator 노트에서 실시간 협업 링크를 생성합니다.
 * 협업 모드를 시작하고, 참여자용 링크를 생성합니다.
 */

"use client";

import { useState } from "react";
import { Share2, Copy, Check, ExternalLink, Users } from "lucide-react";

interface ShareLinkButtonProps {
  noteId: string;
  noteTitle: string;
  isCollaborating: boolean;
  onStartCollaboration: () => void;
  onStopCollaboration: () => void;
}

export function ShareLinkButton({
  noteId,
  noteTitle,
  isCollaborating,
  onStartCollaboration,
  onStopCollaboration,
}: ShareLinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // 공유 링크 생성
  const handleGenerateLink = async () => {
    setIsGenerating(true);

    try {
      // TODO: 백엔드 API 호출하여 토큰 생성
      // const response = await fetch("/api/shared-notes/generate", {
      //   method: "POST",
      //   body: JSON.stringify({ noteId }),
      // });
      // const { token } = await response.json();

      // 임시: 랜덤 토큰 생성
      const token = `${noteId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      // URL 파라미터 방식: /note/educator/[noteId]?join=token
      const link = `${window.location.origin}/note/educator/${noteId}?join=${token}&title=${encodeURIComponent(noteTitle)}`;

      setShareLink(link);

      // 협업 모드 시작
      onStartCollaboration();
    } catch (error) {
      console.error("Failed to generate share link:", error);
      alert("공유 링크 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 클립보드에 복사
  const handleCopy = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("복사에 실패했습니다.");
    }
  };

  // 새 탭에서 열기
  const handleOpenInNewTab = () => {
    if (!shareLink) return;
    window.open(shareLink, "_blank");
  };

  return (
    <>
      {/* 공유 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
          isCollaborating
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-[#AFC02B] hover:bg-[#9DAF25] text-[#1E1E1E]"
        }`}
      >
        {isCollaborating ? (
          <>
            <Users size={18} />
            <span>협업 중</span>
          </>
        ) : (
          <>
            <Share2 size={18} />
            <span>실시간 협업 시작</span>
          </>
        )}
      </button>

      {/* 모달 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-[#2F2F2F] rounded-xl shadow-2xl w-full max-w-lg mx-4">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-[#3C3C3C]">
              <h2 className="text-xl font-bold text-white">실시간 협업 링크</h2>
              <p className="text-gray-400 text-sm mt-1">
                링크를 공유하여 다른 사람들과 실시간으로 협업하세요
              </p>
            </div>

            {/* 바디 */}
            <div className="px-6 py-6">
              {!shareLink ? (
                <div className="text-center py-8">
                  <Share2 className="mx-auto mb-4 text-gray-500" size={48} />
                  <p className="text-gray-400 mb-6">
                    공유 링크를 생성하면 다른 사람들이 <br />
                    이 노트에 실시간으로 참여할 수 있습니다.
                  </p>
                  {isCollaborating && (
                    <div className="bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-lg p-3 mb-4">
                      <p className="text-green-300 text-sm">
                        ✅ 협업 모드가 활성화되었습니다!
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateLink}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-[#AFC02B] text-[#1E1E1E] rounded-lg font-bold hover:bg-[#9DAF25] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? "생성 중..." : isCollaborating ? "새 링크 생성" : "공유 링크 생성"}
                  </button>
                </div>
              ) : (
                <div>
                  {/* 노트 정보 */}
                  <div className="bg-[#1E1E1E] rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-400 mb-1">노트</p>
                    <p className="text-white font-medium">{noteTitle}</p>
                  </div>

                  {/* 공유 링크 */}
                  <div className="bg-[#1E1E1E] rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-400 mb-2">공유 링크</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 bg-[#2F2F2F] text-gray-300 px-3 py-2 rounded border border-[#3C3C3C] text-sm"
                      />
                      <button
                        onClick={handleCopy}
                        className="px-4 py-2 bg-[#3C3C3C] hover:bg-[#4A4A4A] rounded transition-colors"
                        title="복사"
                      >
                        {isCopied ? (
                          <Check size={18} className="text-green-400" />
                        ) : (
                          <Copy size={18} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 안내 */}
                  <div className="bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg p-4 mb-4">
                    <p className="text-blue-300 text-sm">
                      💡 이 링크를 통해 접속한 사용자들은:
                    </p>
                    <ul className="text-blue-200 text-sm mt-2 space-y-1 list-disc list-inside">
                      <li>PDF 페이지가 실시간으로 동기화됩니다</li>
                      <li>필기 내용이 실시간으로 표시됩니다</li>
                      <li>손들기, 투표, Q&A 등 협업 기능을 사용할 수 있습니다</li>
                    </ul>
                  </div>

                  {/* 새 탭에서 열기 */}
                  <button
                    onClick={handleOpenInNewTab}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#3C3C3C] hover:bg-[#4A4A4A] text-white rounded-lg transition-colors"
                  >
                    <ExternalLink size={18} />
                    <span>새 탭에서 열기</span>
                  </button>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-[#3C3C3C] flex justify-between items-center">
              <div>
                {isCollaborating && (
                  <button
                    onClick={() => {
                      onStopCollaboration();
                      setIsOpen(false);
                      setShareLink(null);
                    }}
                    className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    협업 종료
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShareLink(null);
                  setIsCopied(false);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
