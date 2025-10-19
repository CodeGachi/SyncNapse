/**
 * 스크립트 패널 컴포넌트
 */

interface ScriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScriptPanel({ isOpen, onClose }: ScriptPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="mt-3 bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-6 w-full">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-bold">Script</h3>
        <button
          onClick={onClose}
          className="text-[#b9b9b9] hover:text-white transition-colors"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 스크립트 내용 영역 */}
      <div className="bg-[#1e1e1e] rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
        <p className="text-[#b9b9b9] text-sm">
          스크립트 내용이 여기에 표시됩니다.
        </p>
      </div>
    </div>
  );
}
