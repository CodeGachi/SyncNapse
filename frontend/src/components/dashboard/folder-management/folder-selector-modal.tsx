/**
 * 폴더 선택 모달 컴포넌트
 * Figma 디자인 기반 (참고.css 스타일 적용)
 */

"use client";

import { Modal } from "@/components/common/modal";
import type { FolderTreeNode } from "@/features/dashboard";
import { useFolderSelectorModal } from "@/features/dashboard";

interface FolderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string) => void;
  folderTree: FolderTreeNode[];
  selectedFolderId: string;
}

interface FolderItemProps {
  node: FolderTreeNode;
  level: number;
  selectedFolderId: string;
  expandedFolders: Set<string>;
  onToggle: (folderId: string) => void;
  onSelect: (folderId: string) => void;
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
        className={`flex items-center gap-2 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? "bg-[#899649]/30 text-white"
            : "text-[#D9D9D9] hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px`, paddingRight: "12px" }}
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
          className="w-4 h-4 flex-shrink-0"
          fill="#F5D742"
          viewBox="0 0 20 20"
        >
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>

        {/* 폴더 이름 */}
        <span className="flex-1 text-sm truncate font-medium">{node.folder.name}</span>
      </div>

      {/* 하위 폴더 */}
      {isExpanded && hasChildren && (
        <div>
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

export function FolderSelectorModal({
  isOpen,
  onClose,
  onSelect,
  folderTree,
  selectedFolderId,
}: FolderSelectorModalProps) {
  const { tempSelectedId, setTempSelectedId, expandedFolders, toggleFolder } =
    useFolderSelectorModal({ isOpen, selectedFolderId });

  const handleConfirm = () => {
    onSelect(tempSelectedId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-[60] transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-[60] flex items-center justify-center p-4"
      contentClassName="flex flex-col items-center p-8 gap-4 bg-[#2F2F2F] rounded-[20px] w-[420px] max-h-[90vh] border border-[#575757]"
      closeButton={false}
    >
      {/* Content Container */}
      <div className="flex flex-col gap-4 w-full">
        {/* Header Row */}
        <div className="flex flex-row justify-between items-center w-full">
          <h2 className="font-['Inter'] font-bold text-2xl text-white">
            폴더 선택
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 폴더 트리 */}
        <div className="bg-[#5E5E67] rounded-[15px] p-3 max-h-[300px] overflow-y-auto">
          {/* 루트 폴더 */}
          <div
            className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
              (tempSelectedId === "root" || (folderTree.length > 0 && tempSelectedId === folderTree[0].folder.id))
                ? "bg-[#899649]/30 text-white"
                : "text-[#D9D9D9] hover:bg-white/5"
            }`}
            onClick={() => {
              const rootFolderId = folderTree.length > 0 ? folderTree[0].folder.id : "root";
              setTempSelectedId(rootFolderId);
            }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-sm font-medium">Root</span>
          </div>

          {/* 폴더 트리 */}
          <div className="mt-1">
            {folderTree.length > 0 && folderTree[0].children.map((child) => (
              <FolderItem
                key={child.folder.id}
                node={child}
                level={0}
                selectedFolderId={tempSelectedId}
                expandedFolders={expandedFolders}
                onToggle={toggleFolder}
                onSelect={setTempSelectedId}
              />
            ))}
          </div>

          {/* 폴더가 없을 때 */}
          {(folderTree.length === 0 || folderTree[0].children.length === 0) && (
            <div className="text-center text-gray-400 py-3 text-sm">
              하위 폴더가 없습니다
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex flex-row justify-end items-center gap-4 pt-2">
          <button
            onClick={onClose}
            className="flex justify-center items-center px-6 h-10 bg-[#5E5E67] rounded-[15px] hover:bg-[#6E6E77] transition-colors"
          >
            <span className="font-['Inter'] font-bold text-sm text-white">
              취소
            </span>
          </button>
          <button
            onClick={handleConfirm}
            className="flex justify-center items-center px-6 h-10 bg-[#899649] rounded-[15px] hover:bg-[#7A8740] transition-colors"
          >
            <span className="font-['Inter'] font-bold text-sm text-white">
              선택
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
