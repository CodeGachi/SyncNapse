/**
 * Root-level notes component
 * Displays notes that are in the root folder without expansion
 */

"use client";

import React from "react";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useRouter } from "next/navigation";

interface RootNotesProps {
  folderId: string;
  onDeleteNote?: (noteId: string) => void;
}

export function RootNotes({ folderId, onDeleteNote }: RootNotesProps) {
  const router = useRouter();
  const { data: notes = [] } = useNotes({ folderId });
  const [noteContextMenu, setNoteContextMenu] = React.useState<{ x: number; y: number; noteId: string } | null>(null);
  const [draggedItem, setDraggedItem] = React.useState<{ type: 'folder' | 'note', id: string } | null>(null);
  const [dragOverItem, setDragOverItem] = React.useState<{ type: 'folder' | 'note', id: string } | null>(null);

  if (notes.length === 0) return null;

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

    // Only allow dropping on folders - not supported for root notes
    setDraggedItem(null);
    setDragOverItem(null);
  };

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
      <div className="mt-1 mb-2 space-y-1">
        {notes.map((note, index) => {
          const isDragOver = dragOverItem?.type === 'note' && dragOverItem?.id === note.id;
          
          return (
          <div
            key={note.id}
            draggable
            onDragStart={(e) => handleDragStart(e, 'note', note.id)}
            onDragOver={(e) => handleDragOver(e, 'note', note.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'note', note.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group text-gray-400 hover:bg-[#2F2F2F] hover:text-white ${isDragOver ? "bg-blue-500/20 border-2 border-blue-500" : ""}`}
            onClick={() => handleNoteClick(note)}
            onContextMenu={(e) => handleNoteContextMenu(e, note.id)}
          >
            {/* Note icon */}
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>

            {/* Note name */}
            <span className="flex-1 text-sm truncate">{note.title}</span>

            {/* Note type badge */}
            {note.type === 'educator' && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                강의
              </span>
            )}

            {/* Delete button (shown on hover) */}
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

      {/* Note context menu (right-click) */}
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
            {/* Open */}
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

            {/* Divider */}
            <div className="my-1 border-t border-[#3C3C3C]" />

            {/* Delete */}
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

