"use client";

import { useCreateMenu } from "@/features/dashboard";

interface CreateMenuProps {
  onCreateNote: () => void;
  onCreateFolder: () => void;
}

export function CreateMenu({ onCreateNote, onCreateFolder }: CreateMenuProps) {
  const { isOpen, menuRef, handleToggle, handleClose } = useCreateMenu();

  const handleCreateNote = () => {
    handleClose();
    onCreateNote();
  };

  const handleCreateFolder = () => {
    handleClose();
    onCreateFolder();
  };

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
          <button
            onClick={handleCreateNote}
            className="w-full text-left px-4 py-3 text-white hover:bg-[#3C3C3C] transition-colors flex items-center gap-3"
          >
            <svg
              className="w-5 h-5 text-[#6B7B3E]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <div>
              <div className="font-medium">New Note</div>
              <div className="text-xs text-gray-400">
                Create a new note with files
              </div>
            </div>
          </button>

          <button
            onClick={handleCreateFolder}
            className="w-full text-left px-4 py-3 text-white hover:bg-[#3C3C3C] transition-colors flex items-center gap-3 border-t border-[#3C3C3C]"
          >
            <svg
              className="w-5 h-5 text-[#AFC02B]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <div>
              <div className="font-medium">New Folder</div>
              <div className="text-xs text-gray-400">
                Organize your notes in folders
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
