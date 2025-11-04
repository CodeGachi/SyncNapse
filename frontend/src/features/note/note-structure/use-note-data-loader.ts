/**
 * NoteDataLoader Hook
 * 파일 로드 및 자동저장 연동 로직 (TanStack Query 사용)
 */

import { useEffect } from "react";
import { useNoteEditorStore } from "@/stores";
import { useFilesWithIdByNote } from "@/lib/api/queries/files.queries";
import { useRecordingsByNote } from "@/lib/api/queries/recordings.queries";
import { saveNoteContent } from "@/lib/api/services/notes.api";

interface UseNoteDataLoaderProps {
  noteId: string | null;
}

export function useNoteDataLoader({ noteId }: UseNoteDataLoaderProps) {
  const {
    loadFiles: loadFilesToStore,
    addRecording,
    clearRecordings,
    getCurrentPageBlocks,
    selectedFileId,
    currentPage,
  } = useNoteEditorStore();

  // TanStack Query로 파일 목록 조회 (ID 정보 유지)
  const { data: filesWithId = [] } = useFilesWithIdByNote(noteId);

  // TanStack Query로 녹음 목록 조회
  const { data: recordings = [] } = useRecordingsByNote(noteId);

  // 자동저장 콜백
  const handleAutoSave = async () => {
    if (!noteId) return;

    const blocks = getCurrentPageBlocks();

    if (selectedFileId && currentPage) {
      await saveNoteContent(noteId, `${selectedFileId}-${currentPage}`, blocks);
    }
  };

  // 파일과 녹음 목록이 변경되면 스토어에 로드
  useEffect(() => {
    if (!noteId) {
      loadFilesToStore([]);
      clearRecordings();
      return;
    }

    // 파일 로드 (ID 정보 유지)
    const fileItems = filesWithId.map((fileWithId) => ({
      id: fileWithId.id, // IndexedDB DBFile ID 사용 (고유성 보장)
      name: fileWithId.file.name,
      type: fileWithId.file.type,
      size: fileWithId.file.size,
      uploadedAt: new Date(fileWithId.createdAt).toISOString(),
      url: URL.createObjectURL(fileWithId.file),
    }));

    loadFilesToStore(fileItems);

    // 녹음 로드
    clearRecordings();
    if (recordings.length > 0) {
      recordings.forEach((recording) => {
        addRecording({
          title: recording.name,
          duration: recording.duration,
          createdAt: new Date(recording.createdAt),
          audioBlob: recording.recordingData,
        });
      });
    }
    // filesWithId.length와 recordings.length로 추적하여 무한 루프 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, filesWithId.length, recordings.length]);

  return {
    handleAutoSave,
  };
}
