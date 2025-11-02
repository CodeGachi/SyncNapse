/**
 * 폴더 생성 모달 컴포넌트
 * 폴더 생성 위치를 선택하고 폴더 이름을 입력
 */

"use client";

import { Modal } from "@/components/common/modal";
import type { FolderTreeNode } from "@/features/dashboard";
import { useCreateFolderModal } from "@/features/dashboard";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (folderName: string, parentId: string | null) => Promise<void>;
  folderTree: FolderTreeNode[];
}

interface FolderItemProps {
  node: FolderTreeNode;
  level: number;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onToggle: (folderId: string) => void;
  onSelect: (folderId: string | null) => void;
}

function FolderItem({
  node,
  level,
  selectedFolderId,
  expandedFolders,
  onToggle,
  onSelect,
}: FolderItemProps) {
  const isExpanded = expandedFolders.has(node.folder.id);
  const isSelected = selectedFolderId === node.folder.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? "bg-[#6B7B3E] text-white"
            : "text-gray-300 hover:bg-[#3C3C3C] hover:text-white"
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelect(node.folder.id)}
      >
        {/* 확장/축소 버튼 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.folder.id);
            }}
            className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
            </svg>
          </button>
        ) : (
          <div className="w-4 h-4 flex-shrink-0" />
        )}

        {/* 폴더 아이콘 */}
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>

        {/* 폴더 이름 */}
        <span className="flex-1 text-sm truncate">{node.folder.name}</span>
      </div>

      {/* 하위 폴더 */}
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((child) => (
            <FolderItem
              key={child.folder.id}
              node={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CreateFolderModal({
  isOpen,
  onClose,
  onCreate,
  folderTree,
}: CreateFolderModalProps) {
  const {
    folderName,
    setFolderName,
    selectedParentId,
    setSelectedParentId,
    expandedFolders,
    isCreating,
    toggleFolder,
    handleCreate,
    getSelectedLocationText,
  } = useCreateFolderModal({ isOpen, onCreate, folderTree });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-50 transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      contentClassName="bg-[#2F2F2F] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 w-full max-w-[500px]"
      closeButton={false}
    >
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Create New Folder</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L17 17M17 1L1 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 폴더 이름 입력 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Folder Name
        </label>
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Enter folder name"
          className="w-full bg-[#191919] text-white px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#6B7B3E] placeholder-gray-500"
          autoFocus
        />
      </div>

      {/* 위치 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Location
        </label>
        <div className="text-xs text-gray-400 mb-2">
          Selected: <span className="text-[#AFC02B]">{getSelectedLocationText()}</span>
        </div>
        <div className="bg-[#191919] rounded-lg p-4 max-h-[300px] overflow-y-auto">
          {/* 루트 폴더 */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-2 ${
              selectedParentId === null
                ? "bg-[#6B7B3E] text-white"
                : "text-gray-300 hover:bg-[#3C3C3C] hover:text-white"
            }`}
            onClick={() => setSelectedParentId(null)}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-sm font-medium">Root</span>
          </div>

          {/* 폴더 트리 */}
          <div className="space-y-1">
            {folderTree.map((node) => (
              <FolderItem
                key={node.folder.id}
                node={node}
                level={0}
                selectedFolderId={selectedParentId}
                expandedFolders={expandedFolders}
                onToggle={toggleFolder}
                onSelect={setSelectedParentId}
              />
            ))}
          </div>

          {/* 폴더가 없을 때 */}
          {folderTree.length === 0 && (
            <div className="text-center text-gray-400 py-4 text-sm">
              No folders yet. Create in Root.
            </div>
          )}
        </div>
      </div>

      {/* 푸터 */}
      <div className="flex justify-end gap-3 pt-2 border-t border-[#3C3C3C]">
        <button
          onClick={onClose}
          disabled={isCreating}
          className="px-4 py-2 bg-[#575757] text-white rounded-lg hover:bg-[#6B6B6B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!folderName.trim() || isCreating}
          className="px-4 py-2 bg-[#6B7B3E] text-white rounded-lg hover:bg-[#7A8A4D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? "Creating..." : "Create Folder"}
        </button>
      </div>
    </Modal>
  );
}
