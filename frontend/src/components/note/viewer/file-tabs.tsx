/**
 * 파일 탭 UI 컴포넌트
 */

"use client";

interface FileTabsProps {
  files: { id: number; name: string }[];
  activeTab: number;
  onTabChange: (index: number) => void;
  onTabClose?: (index: number) => void;
}

export function FileTabs({ files, activeTab, onTabChange, onTabClose }: FileTabsProps) {
  const handleClose = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onTabClose?.(index);
  };

  return (
    <div className="flex items-end w-full">
      {files.map((file, index) => (
        <div
          key={file.id}
          onClick={() => onTabChange(index)}
          className={`${
            activeTab === index
              ? "bg-[#2f2f2f] border-t border-x border-[#3c3c3c]"
              : "bg-[#1e1e1e] border-t border-r border-[#3c3c3c] border-b"
          } h-[32px] w-[120px] flex items-center justify-between gap-1 px-2 cursor-pointer hover:bg-[#2f2f2f] transition-colors group`}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {/* 파일 아이콘 */}
            <svg width="14" height="14" viewBox="0 0 17 17" fill="none" className="flex-shrink-0">
              <path
                d="M10 2V6H14"
                stroke="white"
                strokeWidth="2"
              />
              <path
                d="M4 2V15H13V6L10 2H4Z"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
            <span className="text-white text-xs font-medium truncate">
              {file.name}
            </span>
          </div>

          {/* 닫기 버튼 */}
          {onTabClose && (
            <button
              onClick={(e) => handleClose(e, index)}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-[#444444] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2">
                <path d="M1 1l8 8M9 1l-8 8" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {/* 빈 공간 하단 border */}
      <div className="flex-1 border-b border-[#3c3c3c]" />
    </div>
  );
}
