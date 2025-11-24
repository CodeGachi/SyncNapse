/**
 * 폴더 트리 컴포넌트
 * 중첩된 폴더 구조와 노트를 재귀적으로 렌더링
 */

"use client";

import React from "react";
import type { FolderTreeNode } from "@/features/dashboard";
import { useFolderTree } from "@/features/dashboard";
import { FolderOptionsMenu } from "./folder-options-menu";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useRouter } from "next/navigation";

interface FolderTreeProps {
  tree: FolderTreeNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateSubFolder: (parentId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteNote?: (noteId: string) => void; // Add note delete handler
  level?: number;
}

export function FolderTree({
  tree,
  selectedFolderId,
  onSelectFolder,
  onCreateSubFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteNote,
  level = 0,
}: FolderTreeProps) {
  const router = useRouter();
  const {
    expandedFolders,
    contextMenu,
    toggleFolder,
    handleContextMenu,
    closeContextMenu,
    handleContextMenuAction,
  } = useFolderTree();

  const [draggedItem, setDraggedItem] = React.useState<{ type: 'folder' | 'note', id: string } | null>(null);
  const [dragOverItem, setDragOverItem] = React.useState<{ type: 'folder' | 'note', id: string } | null>(null);

  const handleDragStart = (e: React.DragEvent, type: 'folder' | 'note', id: string) => {
    e.stopPropagation();
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, type: 'folder' | 'note', id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && !(draggedItem.type === type && draggedItem.id === id)) {
      setDragOverItem({ type, id });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, targetType: 'folder' | 'note', targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || (draggedItem.type === targetType && draggedItem.id === targetId)) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Only allow dropping on folders
    if (targetType === 'folder') {
      try {
        if (draggedItem.type === 'folder') {
          // Move folder (with all its children)
          const { moveFolder } = await import('@/lib/api/services/folders.api');
          await moveFolder(draggedItem.id, targetId);
        } else {
          // Move note to folder
          const { updateNote } = await import('@/lib/api/services/notes.api');
          await updateNote(draggedItem.id, { folderId: targetId });
        }
        
        // Invalidate React Query caches to refresh data
        const { useQueryClient } = await import('@tanstack/react-query');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('folders-updated'));
          window.dispatchEvent(new CustomEvent('notes-synced'));
        }
        
        // Force reload after a short delay to ensure backend sync
        setTimeout(() => {
          window.location.reload();
        }, 300);
      } catch (error) {
        console.error('Failed to move item:', error);
        alert('이동에 실패했습니다. 다시 시도해주세요.');
      }
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <>
      <ul className="space-y-1">
        {tree.map((node, index) => {
          const isExpanded = expandedFolders.has(node.folder.id);
          const isSelected = selectedFolderId === node.folder.id;
          const hasChildren = node.children.length > 0;
          const isDragOver = dragOverItem?.type === 'folder' && dragOverItem?.id === node.folder.id;
          const isLastItem = index === tree.length - 1;

          return (
            <li key={node.folder.id} className="relative">
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, 'folder', node.folder.id)}
                onDragOver={(e) => handleDragOver(e, 'folder', node.folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'folder', node.folder.id)}
                className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
                  isSelected
                    ? "text-[#AFC02B]"
                    : "text-gray-300 hover:text-white"
                } ${isDragOver ? "bg-blue-500/20 border-2 border-blue-500" : ""}`}
                style={{ 
                  marginLeft: level > 0 ? `${level * 16}px` : '0px',
                  paddingLeft: level > 0 ? '12px' : '8px'
                }}
                onClick={() => onSelectFolder(node.folder.id)}
                onContextMenu={(e) => handleContextMenu(e, node.folder.id)}
              >
                {/* Tree connector (only for level > 0) */}
                {level > 0 && (
                  <>
                    {/* Vertical line from top */}
                    <div 
                      className="absolute top-0 w-px bg-gray-600"
                      style={{ 
                        left: '4px',
                        height: '50%'
                      }}
                    />
                    {/* Vertical line to bottom (if not last item) */}
                    {!isLastItem && (
                      <div 
                        className="absolute top-1/2 w-px bg-gray-600"
                        style={{ 
                          left: '4px',
                          height: '100%'
                        }}
                      />
                    )}
                    {/* Horizontal line */}
                    <div 
                      className="absolute top-1/2 w-2 h-px bg-gray-600"
                      style={{ left: '4px' }}
                    />
                  </>
                )}
                {/* 확장/축소 아이콘 */}
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(node.folder.id);
                    }}
                    className="w-4 h-4 flex items-center justify-center"
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
                )}

                {/* 폴더 아이콘 */}
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>

                {/* 폴더 이름 */}
                <span className="flex-1 text-sm truncate">
                  {node.folder.name}
                </span>

                {/* 폴더 옵션 메뉴 */}
                <FolderOptionsMenu
                  folder={node.folder}
                  onRename={() => onRenameFolder(node.folder.id)}
                  onAddSubfolder={() => onCreateSubFolder(node.folder.id)}
                  onDelete={() => onDeleteFolder(node.folder.id)}
                />
              </div>

              {/* 하위 폴더 (먼저 표시) */}
              {isExpanded && hasChildren && (
                <FolderTree
                  tree={node.children}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={onSelectFolder}
                  onCreateSubFolder={onCreateSubFolder}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                  onDeleteNote={onDeleteNote}
                  level={level + 1}
                />
              )}

              {/* 노트 목록 표시 (폴더 다음에 표시) */}
              {isExpanded && (
                <FolderNotes 
                  folderId={node.folder.id} 
                  level={level + 1} 
                  onDeleteNote={onDeleteNote}
                  draggedItem={draggedItem}
                  dragOverItem={dragOverItem}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              )}
            </li>
          );
        })}
      </ul>

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-[#2F2F2F] border border-[#3C3C3C] rounded-lg shadow-lg py-1 w-48"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            {/* 이름 변경 */}
            <button
              onClick={() => handleContextMenuAction(() => onRenameFolder(contextMenu.folderId))}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3C3C3C] hover:text-white transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Rename
            </button>

            {/* 하위 폴더 추가 */}
            <button
              onClick={() => handleContextMenuAction(() => onCreateSubFolder(contextMenu.folderId))}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3C3C3C] hover:text-white transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
              Add Subfolder
            </button>

            {/* 구분선 */}
            <div className="my-1 border-t border-[#3C3C3C]" />

            {/* 삭제 */}
            <button
              onClick={() => handleContextMenuAction(() => onDeleteFolder(contextMenu.folderId))}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}

/**
 * 폴더 내 노트 목록 컴포넌트
 */
function FolderNotes({ 
  folderId, 
  level, 
  onDeleteNote,
  draggedItem,
  dragOverItem,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: { 
  folderId: string; 
  level: number; 
  onDeleteNote?: (noteId: string) => void;
  draggedItem: { type: 'folder' | 'note', id: string } | null;
  dragOverItem: { type: 'folder' | 'note', id: string } | null;
  onDragStart: (e: React.DragEvent, type: 'folder' | 'note', id: string) => void;
  onDragOver: (e: React.DragEvent, type: 'folder' | 'note', id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, type: 'folder' | 'note', id: string) => void;
}) {
  const router = useRouter();
  const { data: notes = [] } = useNotes({ folderId });
  const [noteContextMenu, setNoteContextMenu] = React.useState<{ x: number; y: number; noteId: string } | null>(null);

  if (notes.length === 0) return null;

  const handleNoteContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNoteContextMenu({
      x: e.clientX,
      y: e.clientY,
      noteId,
    });
  };

  const closeNoteContextMenu = () => {
    setNoteContextMenu(null);
  };

  const handleNoteClick = (note: any) => {
    const noteType = note.type || "student";
    const path = noteType === "educator" ? `/note/educator/${note.id}` : `/note/student/${note.id}`;
    router.push(path);
  };

  return (
    <>
      <div className="space-y-1">
        {notes.map((note, index) => {
          const isDragOver = dragOverItem?.type === 'note' && dragOverItem?.id === note.id;
          const isLastNote = index === notes.length - 1;
          
          return (
          <div
            key={note.id}
            draggable
            onDragStart={(e) => onDragStart(e, 'note', note.id)}
            onDragOver={(e) => onDragOver(e, 'note', note.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, 'note', note.id)}
            className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group text-gray-400 hover:bg-[#2F2F2F] hover:text-white ${isDragOver ? "bg-blue-500/20 border-2 border-blue-500" : ""}`}
            style={{ 
              marginLeft: `${level * 16}px`,
              paddingLeft: '12px'
            }}
            onClick={() => handleNoteClick(note)}
            onContextMenu={(e) => handleNoteContextMenu(e, note.id)}
          >
            {/* Tree connector */}
            <>
              {/* Vertical line from top */}
              <div 
                className="absolute top-0 w-px bg-gray-600"
                style={{ 
                  left: '4px',
                  height: '50%'
                }}
              />
              {/* Vertical line to bottom (if not last note) */}
              {!isLastNote && (
                <div 
                  className="absolute top-1/2 w-px bg-gray-600"
                  style={{ 
                    left: '4px',
                    height: '100%'
                  }}
                />
              )}
              {/* Horizontal line */}
              <div 
                className="absolute top-1/2 w-2 h-px bg-gray-600"
                style={{ left: '4px' }}
              />
            </>
            {/* 노트 아이콘 */}
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>

            {/* 노트 이름 */}
            <span className="flex-1 text-sm truncate">{note.title}</span>

            {/* 노트 타입 뱃지 */}
            {note.type === 'educator' && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                강의
              </span>
            )}

            {/* 삭제 버튼 (hover 시 표시) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteNote) {
                  onDeleteNote(note.id);
                }
              }}
              className="p-1 hover:bg-[#3C3C3C] rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Delete note"
            >
              <svg
                className="w-4 h-4 text-gray-400 hover:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
          );
        })}
      </div>

      {/* 노트 우클릭 컨텍스트 메뉴 */}
      {noteContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeNoteContextMenu}
          />
          <div
            className="fixed z-50 bg-[#2F2F2F] border border-[#3C3C3C] rounded-lg shadow-lg py-1 w-48"
            style={{
              left: noteContextMenu.x,
              top: noteContextMenu.y,
            }}
          >
            {/* 열기 */}
            <button
              onClick={() => {
                const note = notes.find(n => n.id === noteContextMenu.noteId);
                if (note) {
                  handleNoteClick(note);
                }
                closeNoteContextMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3C3C3C] hover:text-white transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Open
            </button>

            {/* 구분선 */}
            <div className="my-1 border-t border-[#3C3C3C]" />

            {/* 삭제 */}
            <button
              onClick={() => {
                if (onDeleteNote) {
                  onDeleteNote(noteContextMenu.noteId);
                }
                closeNoteContextMenu();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}
