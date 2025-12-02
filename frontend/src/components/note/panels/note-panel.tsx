/**
 * 노트 패널 컴포넌트 (BlockNote 기반 에디터)
 *
 * 초기 마운트 및 페이지 변경 시에만 콘텐츠 로드
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useNoteEditorStore } from "@/stores";
import { useNoteContent } from "@/features/note/editor/use-note-content";
import { createLogger } from "@/lib/utils/logger";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { LoadingScreen } from "@/components/common/loading-screen";
import { Spinner } from "@/components/common/spinner";

const log = createLogger("NotePanel");

interface NotePanelProps {
  isOpen: boolean;
  noteId?: string | null;
}

export function NotePanel({ isOpen, noteId }: NotePanelProps) {
  const {
    pageNotes,
    updatePageBlocksFromBlockNote,
    currentPage,
    selectedFileId,
  } = useNoteEditorStore();

  // 자동 저장 훅 (noteId가 있으면 패널 열림/닫힘 상태와 관계없이 항상 콘텐츠 로드)
  const { scheduleAutoSave, forceSave, isSaving, lastSavedAt, isLoading } = useNoteContent({
    noteId,
    enabled: !!noteId,
  });

  // 콘텐츠 로드 여부 추적
  const [shouldLoadContent, setShouldLoadContent] = useState(true);
  const prevPageRef = useRef<number>(currentPage);
  const isInitialMountRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const prevNoteIdRef = useRef<string | null | undefined>(noteId);

  // noteId 변경 시 hasLoadedRef 리셋 (다른 노트로 전환)
  useEffect(() => {
    if (prevNoteIdRef.current !== noteId) {
      log.debug("노트 변경, 로드 상태 리셋");
      hasLoadedRef.current = false;
      setShouldLoadContent(true);
      prevNoteIdRef.current = noteId;
    }
  }, [noteId]);

  /**
   * 에디터 초기 콘텐츠 가져오기
   * pageNotes를 BlockNote 형식으로 변환
   */
  const initialContent = useMemo(() => {
    const pageKey = selectedFileId ? `${selectedFileId}-${currentPage}` : null;
    const blocks = pageKey ? pageNotes[pageKey] : null;

    log.debug("콘텐츠 빌드:", {
      pageKey,
      hasBlocks: !!blocks,
      blockCount: blocks?.length || 0,
      firstBlockContent: blocks?.[0]?.content,
    });

    if (!blocks || blocks.length === 0) {
      return [{
        type: "paragraph",
        content: "",
      }] as PartialBlock[];
    }

    return blocks.map((block: any) => {
      const blockType = mapTypeToBlockNote(block.type);

      if (block.type === "checkbox") {
        return {
          type: "checkListItem" as const,
          content: block.content || "",
          props: {
            checked: block.checked || false,
          },
        } as PartialBlock;
      }

      return {
        type: blockType,
        content: block.content || "",
      } as PartialBlock;
    });
  }, [currentPage, selectedFileId, pageNotes]);

  /**
   * BlockNote 에디터 생성 (초기 콘텐츠 포함)
   */
  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent || undefined,
  });

  /**
   * 페이지 변경 처리 - 현재 페이지 저장 후 새 페이지 로드
   */
  useEffect(() => {
    // 초기 마운트 시 스킵
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevPageRef.current = currentPage;
      log.debug("초기 마운트");
      return;
    }

    // 실제 페이지 변경 시에만 트리거
    if (prevPageRef.current !== currentPage) {
      log.debug("페이지 변경:", prevPageRef.current, "->", currentPage);
      prevPageRef.current = currentPage;

      // 현재 페이지 저장
      if (!isLoading) {
        forceSave();
      }

      // 로드 플래그 리셋 및 콘텐츠 리로드 트리거
      hasLoadedRef.current = false;
      setShouldLoadContent(true);
    }
  }, [currentPage, isLoading, forceSave]);

  /**
   * 초기 로드 시 에디터에 콘텐츠 로드
   * IndexedDB에서 데이터 로드 완료 대기
   */
  useEffect(() => {
    if (!isLoading && !hasLoadedRef.current && editor) {
      const pageKey = selectedFileId ? `${selectedFileId}-${currentPage}` : null;
      const pageData = pageKey ? pageNotes[pageKey] : null;
      const hasActualData = pageData && pageData.length > 0 && pageData[0].content !== "";
      const hasAnyData = Object.keys(pageNotes).length > 0;

      log.debug("데이터 확인:", {
        hasActualData,
        hasAnyData,
        pageDataLength: pageData?.length,
        firstBlockContent: pageData?.[0]?.content,
        pageNotesKeys: Object.keys(pageNotes).slice(0, 3),
      });

      // 실제 콘텐츠 데이터가 있을 때만 로드 완료로 표시
      // IndexedDB 로드 완료를 기다림
      if (hasActualData && initialContent) {
        log.debug("초기 로드 - 로드된 데이터로 에디터 업데이트");
        editor.replaceBlocks(editor.document, initialContent);
        hasLoadedRef.current = true;
        setShouldLoadContent(false);
      } else if (!hasAnyData) {
        log.debug("IndexedDB에서 데이터 대기 중...");
      } else {
        log.debug("스토어 데이터 있음, 실제 콘텐츠 대기 중...");
      }
    }
  }, [isLoading, editor, initialContent, selectedFileId, currentPage, pageNotes]);

  /**
   * 페이지 변경 시 에디터에 콘텐츠 로드
   */
  useEffect(() => {
    if (shouldLoadContent && editor && initialContent && !isLoading) {
      log.debug("페이지 변경 - 에디터 업데이트");
      editor.replaceBlocks(editor.document, initialContent);
      setShouldLoadContent(false);
    }
  }, [shouldLoadContent, editor, initialContent, isLoading]);

  /**
   * 에디터 변경 처리 - 자동 저장 스케줄링
   */
  const handleEditorChange = () => {
    if (!editor || isLoading) {
      return;
    }

    const blocks = editor.document as Block[];
    log.debug("콘텐츠 변경됨");

    // 스토어 업데이트
    updatePageBlocksFromBlockNote(blocks);

    // 자동 저장 스케줄링 (타이핑 중지 2초 후)
    scheduleAutoSave();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="h-full flex flex-col rounded-[15px] border border-border p-1 gap-2.5 bg-background-elevated">
      {/* 저장 상태 헤더 */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            Page {currentPage}
          </span>
          {isSaving && (
            <span className="text-[10px] text-blue-400 flex items-center gap-1">
              <Spinner size="xs" />
              저장 중...
            </span>
          )}
          {!isSaving && lastSavedAt && (
            <span className="text-[10px] text-foreground-tertiary">
              저장됨 {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* 에디터 */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingScreen message="로딩 중..." />
        ) : (
          <div
            className="h-full rounded-[15px] border border-border p-4 bg-background-surface"
          >
            <style dangerouslySetInnerHTML={{
              __html: `
                .bn-container .bn-editor {
                  background-color: var(--background-surface) !important;
                  color: var(--foreground) !important;
                }
                .bn-container .bn-block-content {
                  color: var(--foreground) !important;
                }
                .bn-container [data-content-type] {
                  color: var(--foreground) !important;
                }
                .bn-container .ProseMirror {
                  color: var(--foreground) !important;
                }
                .bn-container .bn-inline-content {
                  color: var(--foreground) !important;
                }
                .bn-container p {
                  color: var(--foreground) !important;
                }
              `
            }} />
            <BlockNoteView
              editor={editor}
              onChange={handleEditorChange}
              theme="light"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 내부 타입을 BlockNote 타입으로 매핑
 */
function mapTypeToBlockNote(type: string): string {
  const mapping: Record<string, string> = {
    text: "paragraph",
    heading1: "heading",
    heading2: "heading",
    heading3: "heading",
    bullet: "bulletListItem",
    number: "numberedListItem",
    checkbox: "checkListItem",
    quote: "paragraph",
    code: "paragraph",
  };

  return mapping[type] || "paragraph";
}
