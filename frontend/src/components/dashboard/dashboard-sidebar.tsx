/**
 * Dashboard Sidebar UI Component
 */

"use client";

import { NoteSettingsModal } from "@/components/dashboard/create-note-modal";
import { useDashboard } from "@/features/dashboard";
import { useAuth } from "@/features/auth/use-auth";
import { useGoogleLogin } from "@/features/auth/google-login";

export function DashboardSidebar() {
  const { isModalOpen, setIsModalOpen, handleCreateNote } = useDashboard();
  const { user } = useAuth();
  const { handleLogout } = useGoogleLogin();

  return (
    <>
    <aside className="w-[214px] h-screen bg-[#191919] flex flex-col p-4 border-r border-[#2F2F2F]">
      <div className="mb-6">
        <h1 className="text-white text-xl font-bold flex items-center gap-2">
          SyncNapse
        </h1>
      </div>

      {/* profile */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-[#2F2F2F] rounded-lg">
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">
            {user?.name || "사용자"}
          </div>
          <div className="text-gray-400 text-xs truncate">
            {user?.email || "user@example.com"}
          </div>
        </div>
      </div>

      {/* new note button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-[#6B7B3E] hover:bg-[#7A8A4D] text-white font-bold py-3 px-4 rounded-lg mb-4 transition-colors"
      >
        New Note
      </button>

      {/* note list */}
      <nav className="flex-1 overflow-y-auto">
        <div className="text-gray-400 text-xs font-bold mb-2 px-2">개인 노트</div>
        <ul className="space-y-1">
          {/* TODO: Implement note list */}
        </ul>
      </nav>

      {/* bottom menu */}
      {/* TODO: Implement Trash, Settings, and Support pages */}
      <div className="border-t border-[#2F2F2F] pt-4 space-y-1">
        <button className="w-full text-left text-gray-400 hover:text-white hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors text-sm">
          휴지통
        </button>
        <button className="w-full text-left text-gray-400 hover:text-white hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors text-sm">
          설정
        </button>
        <button className="w-full text-left text-gray-400 hover:text-white hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors text-sm">
          문의
        </button>
        <button
          onClick={handleLogout}
          className="w-full text-left text-gray-400 hover:text-white hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors text-sm"
        >
          로그아웃
        </button>
      </div>
    </aside>

    {/* note creation modal */}
    <NoteSettingsModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onSubmit={handleCreateNote}
    />
    </>
  );
}
