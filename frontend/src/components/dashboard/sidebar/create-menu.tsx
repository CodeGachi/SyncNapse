"use client";

import { useCreateMenu } from "@/features/dashboard";

interface CreateMenuProps {
  onCreatePersonalNote: () => void;
  onCreateLectureNote: () => void;
  onCreateFolder: () => void;
}

interface MenuItem {
  label: string;
  description: string;
  iconPath: string;
  iconColor: string;
  onClick: () => void;
  hasBorder?: boolean;
}

export function CreateMenu({
  onCreatePersonalNote,
  onCreateLectureNote,
  onCreateFolder
}: CreateMenuProps) {
  const { isOpen, menuRef, handleToggle, handleClose } = useCreateMenu();

  const handleCreatePersonalNote = () => {
    handleClose();
    onCreatePersonalNote();
  };

  const handleCreateLectureNote = () => {
    handleClose();
    onCreateLectureNote();
  };

  const handleCreateFolder = () => {
    handleClose();
    onCreateFolder();
  };

  const menuItems: MenuItem[] = [
    {
      label: "개인 노트",
      description: "개인용 노트를 생성합니다",
      iconPath:
        "M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z",
      iconColor: "#6B7B3E",
      onClick: handleCreatePersonalNote,
    },
    {
      label: "강의 노트",
      description: "학생과 공유 가능한 강의 노트를 생성합니다",
      iconPath:
        "M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z",
      iconColor: "#8A9A4D",
      onClick: handleCreateLectureNote,
      hasBorder: true,
    },
    {
      label: "New Folder",
      description: "Organize your notes in folders",
      iconPath: "M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z",
      iconColor: "#AFC02B",
      onClick: handleCreateFolder,
      hasBorder: true,
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="w-full bg-[#6B7B3E] hover:bg-[#7A8A4D] text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>Create New</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#2F2F2F] border border-[#3C3C3C] rounded-lg shadow-lg overflow-hidden z-50">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={`w-full text-left px-4 py-3 text-white hover:bg-[#3C3C3C] transition-colors flex items-center gap-3 ${
                item.hasBorder ? "border-t border-[#3C3C3C]" : ""
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                style={{ color: item.iconColor }}
              >
                <path d={item.iconPath} />
              </svg>
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-gray-400">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
