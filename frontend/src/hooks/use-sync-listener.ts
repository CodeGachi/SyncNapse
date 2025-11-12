/**
 * Sync Event Listener Hook
 * 서버 동기화 이벤트를 감지하고 React Query 캐시를 무효화합니다
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Listen for sync events and invalidate queries
 */
export function useSyncListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Folders sync event
    const handleFoldersSync = () => {
      console.log('[useSyncListener] Folders synced, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    };

    // Notes sync event
    const handleNotesSync = () => {
      console.log('[useSyncListener] Notes synced, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    };

    // Single note sync event
    const handleNoteSync = ((event: CustomEvent) => {
      const { noteId } = event.detail;
      console.log('[useSyncListener] Note synced, invalidating query:', noteId);
      queryClient.invalidateQueries({ queryKey: ['notes', noteId] });
    }) as EventListener;

    // Files sync event
    const handleFilesSync = ((event: CustomEvent) => {
      const { noteId } = event.detail;
      console.log('[useSyncListener] Files synced for note:', noteId);
      queryClient.invalidateQueries({ queryKey: ['files', 'note', noteId] });
    }) as EventListener;

    // Add event listeners
    window.addEventListener('folders-synced', handleFoldersSync);
    window.addEventListener('notes-synced', handleNotesSync);
    window.addEventListener('note-synced', handleNoteSync);
    window.addEventListener('files-synced', handleFilesSync);

    // Cleanup
    return () => {
      window.removeEventListener('folders-synced', handleFoldersSync);
      window.removeEventListener('notes-synced', handleNotesSync);
      window.removeEventListener('note-synced', handleNoteSync);
      window.removeEventListener('files-synced', handleFilesSync);
    };
  }, [queryClient]);
}

