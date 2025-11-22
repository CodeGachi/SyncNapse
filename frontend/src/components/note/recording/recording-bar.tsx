/**
 * 녹음바 UI 컴포넌트
 */

"use client";

import Image from "next/image";

interface RecordingBarProps {
  isPlaying: boolean;
  time: string;
  onPlayToggle: () => void;
  onStop?: () => void;
  onSave?: () => void;
  onSkipBack?: () => void;
  isRecording?: boolean;
  onToggleRecordingList?: () => void;
  recordingCount?: number;
  // 재생 위치 제어 (녹음본 재생 시)
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
}

export function RecordingBar({
  isPlaying,
  time,
  onPlayToggle,
  onStop,
  onSave,
  onSkipBack,
  isRecording = false,
  onToggleRecordingList,
  recordingCount = 0,
  currentTime = 0,
  duration = 0,
  onSeek,
}: RecordingBarProps) {
  // 재생 중인 녹음본이 있는지 확인 (duration > 0이면 재생 모드)
  const isPlaybackMode = duration > 0 && !isRecording;

  return (
    <div className="w-full bg-[#363636] border-2 border-[#b9b9b9] rounded-[30px] px-6 py-2.5">
      {/* 녹음바 컨트롤 */}
      <div className="flex items-center gap-2 w-full">
        {/* 버튼 1: 녹음 시작/정지 (항상 마이크 아이콘, 녹음 중일 때만 빨간색) */}
        <button
          onClick={onPlayToggle}
          className={`w-[33px] h-[33px] rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 ${
            isRecording ? "bg-red-600" : "bg-[#444444]"
          }`}
          title={isRecording ? "녹음 일시정지/재개" : "녹음 시작"}
        >
          {isRecording ? (
            /* 녹음 중: 일시정지/재개 아이콘 */
            isPlaying ? (
              /* 녹음 진행 중 - 일시정지 아이콘 */
              <svg width="10" height="12" viewBox="0 0 12 14" fill="white">
                <rect x="0" y="0" width="4" height="14" fill="white" />
                <rect x="8" y="0" width="4" height="14" fill="white" />
              </svg>
            ) : (
              /* 녹음 일시정지 - 재개 아이콘 */
              <Image src="/record.svg" alt="Resume Recording" width={16} height={16} />
            )
          ) : (
            /* 녹음 대기: 마이크 아이콘 */
            <Image src="/record.svg" alt="Start Recording" width={16} height={16} />
          )}
        </button>

        {/* 버튼 2: 저장 (Player Stop 아이콘, 녹음 중에만 활성화) */}
        <button
          onClick={isRecording && onSave ? onSave : undefined}
          disabled={!isRecording}
          className={`w-[33px] h-[33px] bg-[#444444] rounded-full flex items-center justify-center flex-shrink-0 transition-opacity ${
            isRecording
              ? "cursor-pointer hover:opacity-80"
              : "opacity-50 cursor-not-allowed"
          }`}
          title="저장"
        >
          <Image
            src="/iconstack.io - (Player Stop).svg"
            alt="Save"
            width={16}
            height={16}
            className={!isRecording ? "opacity-50" : ""}
          />
        </button>

        {/* 시간 표시 */}
        <div className="bg-[#363636] rounded px-3 py-1 flex-shrink-0">
          <p className="text-[#b9b9b9] text-[11px] font-bold whitespace-nowrap">{time}</p>
        </div>

        {/* 재생 위치 바 (Figma Line 8: 208px 흰색 선) */}
        <div className="w-[208px] h-[1px] flex-shrink-0 relative bg-[#ffffff]">
          {/* 재생 진행 표시 (재생 모드에서만) */}
          {isPlaybackMode && duration > 0 && (
            <div
              className="absolute left-0 top-0 h-full bg-[#AFC02B]"
              style={{
                width: `${(currentTime / duration) * 100}%`,
              }}
            />
          )}
          {/* 클릭 가능한 투명 오버레이 (재생 모드에서만) */}
          {isPlaybackMode && (
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={(e) => {
                if (onSeek) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  const newTime = percentage * duration;
                  onSeek(newTime);
                }
              }}
            />
          )}
        </div>

        {/* 버튼 3: 녹음본 재생/일시정지 토글 (재생 모드에서만 활성화) */}
        <button
          onClick={isPlaybackMode && onStop ? onStop : undefined}
          disabled={!isPlaybackMode}
          className={`w-[33px] h-[33px] bg-[#444444] rounded-full flex items-center justify-center flex-shrink-0 transition-opacity ${
            isPlaybackMode
              ? "cursor-pointer hover:opacity-80"
              : "opacity-50 cursor-not-allowed"
          }`}
          title={isPlaybackMode ? (isPlaying ? "일시정지" : "재생") : "녹음본을 선택하세요"}
        >
          {isPlaybackMode && isPlaying ? (
            /* 재생 중: 일시정지 SVG */
            <svg width="10" height="12" viewBox="0 0 12 14" fill="white">
              <rect x="0" y="0" width="4" height="14" fill="white" />
              <rect x="8" y="0" width="4" height="14" fill="white" />
            </svg>
          ) : (
            /* 기본: Player Play 아이콘 */
            <Image
              src="/iconstack.io - (Player Play).svg"
              alt="Play"
              width={20}
              height={20}
              className={!isPlaybackMode ? "opacity-50" : ""}
            />
          )}
        </button>

        {/* Skip Back: 맨앞으로 가기 (Player Skip Back 아이콘, 재생 모드에서만 활성화) */}
        <button
          onClick={isPlaybackMode && onSkipBack ? onSkipBack : undefined}
          disabled={!isPlaybackMode}
          className={`w-[23px] h-[23px] flex items-center justify-center flex-shrink-0 transition-opacity ${
            isPlaybackMode
              ? "cursor-pointer hover:opacity-80"
              : "opacity-50 cursor-not-allowed"
          }`}
          title="맨앞으로"
        >
          <Image
            src="/iconstack.io - (Player Skip Back).svg"
            alt="Skip Back"
            width={23}
            height={23}
            className={!isPlaybackMode ? "opacity-50" : ""}
          />
        </button>

        {/* 녹음 목록 버튼 */}
        {onToggleRecordingList && (
          <button
            onClick={onToggleRecordingList}
            className="flex items-center gap-0.5 px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition-opacity relative flex-shrink-0"
            title="저장된 녹음"
          >
            <Image src="/menu.svg" alt="Recording List" width={19} height={18} />
            {recordingCount > 0 && (
              <span className="text-white text-[9px] font-bold bg-[#AFC02B] rounded-full px-1 py-0.5 min-w-[16px] text-center">
                {recordingCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}