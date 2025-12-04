/**
 * 페이지 컨텐츠 API 클라이언트
 * 페이지별 노트 컨텐츠 저장 및 로딩 처리
 */

import { createLogger } from "@/lib/utils/logger";
import { apiClient } from '../client';

const log = createLogger("PageContentAPI");
import type { NoteBlock as NoteBlockType } from '@/lib/types';

// Extend NoteBlock with API-specific fields
export type NoteBlock = NoteBlockType & {
  // Additional fields for API compatibility
  listType?: string;
  listIndex?: number;
  isVisible?: boolean;
  children?: string[];
};

export interface PageBlocks {
  blocks: NoteBlock[];
}

export interface NoteContent {
  id?: string;
  noteId: string;
  pages: {
    [pageNumber: string]: PageBlocks;
  };
  version: number;
  storageKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveNoteContentDto {
  noteId: string;
  pages: {
    [pageNumber: string]: PageBlocks;
  };
}

// Legacy interfaces for backward compatibility
export interface PageContent {
  id?: string;
  noteId: string;
  pageNumber: number;
  blocks: NoteBlock[];
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavePageContentDto {
  noteId: string;
  pageNumber: number;
  blocks: NoteBlock[];
}

/**
 * 페이지 컨텐츠 저장 또는 업데이트
 */
export async function savePageContent(
  noteId: string,
  pageNumber: number,
  blocks: NoteBlock[],
): Promise<PageContent> {
  log.debug('Saving page content:', {
    noteId,
    pageNumber,
    blockCount: blocks.length,
  });

  const response = await apiClient<PageContent>(
    `/notes/${noteId}/pages/${pageNumber}/content`,
    {
      method: 'POST',
      body: JSON.stringify({
        noteId,
        pageNumber,
        blocks,
      }),
    },
  );

  log.info('✅ Page content saved');
  return response;
}

/**
 * 페이지 컨텐츠 가져오기
 */
export async function getPageContent(
  noteId: string,
  pageNumber: number,
): Promise<PageContent> {
  log.debug('Loading page content:', {
    noteId,
    pageNumber,
  });

  const response = await apiClient<PageContent>(
    `/notes/${noteId}/pages/${pageNumber}/content`,
    {
      method: 'GET',
    },
  );

  log.info('✅ Page content loaded:', {
    blockCount: response.blocks.length,
  });
  return response;
}

/**
 * 페이지 컨텐츠 삭제
 */
export async function deletePageContent(
  noteId: string,
  pageNumber: number,
): Promise<void> {
  log.debug('Deleting page content:', {
    noteId,
    pageNumber,
  });

  await apiClient<void>(
    `/notes/${noteId}/pages/${pageNumber}/content`,
    {
      method: 'DELETE',
    },
  );

  log.info('✅ Page content deleted');
}

/**
 * 전체 노트 컨텐츠 저장 (모든 페이지)
 */
export async function saveNoteContent(
  noteId: string,
  pages: { [pageNumber: string]: PageBlocks },
): Promise<NoteContent> {
  log.debug('Saving note content:', {
    noteId,
    pageCount: Object.keys(pages).length,
  });

  // Debug: Log the actual data being sent
  const firstPageKey = Object.keys(pages)[0];
  if (firstPageKey && pages[firstPageKey]) {
    const firstPage = pages[firstPageKey];
    log.debug(`📤 Sending to backend - First page (${firstPageKey}):`, {
      blockCount: firstPage.blocks?.length || 0,
      firstBlock: firstPage.blocks?.[0],
      firstBlockContent: firstPage.blocks?.[0]?.content,
      firstBlockType: firstPage.blocks?.[0]?.type,
      allBlocks: firstPage.blocks,
    });
  }

  const bodyData = {
    noteId,
    pages,
  };

  log.debug('📤 Full request body:', JSON.stringify(bodyData, null, 2));

  const response = await apiClient<NoteContent>(
    `/notes/${noteId}/content`,
    {
      method: 'POST',
      body: JSON.stringify(bodyData),
    },
  );

  log.info('✅ Note content saved');
  return response;
}

/**
 * 전체 노트 컨텐츠 가져오기 (모든 페이지)
 */
export async function getNoteContent(
  noteId: string,
): Promise<NoteContent> {
  log.debug('Loading note content:', { noteId });

  const response = await apiClient<NoteContent>(
    `/notes/${noteId}/content`,
    {
      method: 'GET',
    },
  );

  log.info('✅ Note content loaded:', {
    pageCount: Object.keys(response.pages || {}).length,
  });

  // Debug: Log the loaded data
  const firstPageKey = Object.keys(response.pages || {})[0];
  if (firstPageKey && response.pages[firstPageKey]) {
    const firstPage = response.pages[firstPageKey];
    log.debug(`📥 Received from backend - First page (${firstPageKey}):`, {
      blockCount: firstPage.blocks?.length || 0,
      firstBlock: firstPage.blocks?.[0],
      firstBlockContent: firstPage.blocks?.[0]?.content,
      firstBlockType: firstPage.blocks?.[0]?.type,
      allBlocks: firstPage.blocks,
    });
  }

  return response;
}

/**
 * 전체 노트 컨텐츠 삭제
 */
export async function deleteNoteContent(
  noteId: string,
): Promise<void> {
  log.debug('Deleting note content:', { noteId });

  await apiClient<void>(
    `/notes/${noteId}/content`,
    {
      method: 'DELETE',
    },
  );

  log.info('✅ Note content deleted');
}

