/**
 * Page Content API Client
 * Handles saving and loading page-specific note content
 */

import { apiClient } from '../client';
import type { NoteBlock as NoteBlockType } from '@/features/note/text-notes/use-note-panel';

// Re-export NoteBlock from use-note-panel to ensure type consistency
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
 * Save or update page content
 */
export async function savePageContent(
  noteId: string,
  pageNumber: number,
  blocks: NoteBlock[],
): Promise<PageContent> {
  console.log('[PageContentAPI] Saving page content:', {
    noteId,
    pageNumber,
    blockCount: blocks.length,
  });

  const response = await apiClient<PageContent>(
    `/api/notes/${noteId}/pages/${pageNumber}/content`,
    {
      method: 'POST',
      body: JSON.stringify({
        noteId,
        pageNumber,
        blocks,
      }),
    },
  );

  console.log('[PageContentAPI] ✅ Page content saved');
  return response;
}

/**
 * Get page content
 */
export async function getPageContent(
  noteId: string,
  pageNumber: number,
): Promise<PageContent> {
  console.log('[PageContentAPI] Loading page content:', {
    noteId,
    pageNumber,
  });

  const response = await apiClient<PageContent>(
    `/api/notes/${noteId}/pages/${pageNumber}/content`,
    {
      method: 'GET',
    },
  );

  console.log('[PageContentAPI] ✅ Page content loaded:', {
    blockCount: response.blocks.length,
  });
  return response;
}

/**
 * Delete page content
 */
export async function deletePageContent(
  noteId: string,
  pageNumber: number,
): Promise<void> {
  console.log('[PageContentAPI] Deleting page content:', {
    noteId,
    pageNumber,
  });

  await apiClient<void>(
    `/api/notes/${noteId}/pages/${pageNumber}/content`,
    {
      method: 'DELETE',
    },
  );

  console.log('[PageContentAPI] ✅ Page content deleted');
}

/**
 * Save entire note content (all pages)
 */
export async function saveNoteContent(
  noteId: string,
  pages: { [pageNumber: string]: PageBlocks },
): Promise<NoteContent> {
  console.log('[PageContentAPI] Saving note content:', {
    noteId,
    pageCount: Object.keys(pages).length,
  });

  // Debug: Log the actual data being sent
  const firstPageKey = Object.keys(pages)[0];
  if (firstPageKey && pages[firstPageKey]) {
    const firstPage = pages[firstPageKey];
    console.log(`[PageContentAPI] 📤 Sending to backend - First page (${firstPageKey}):`, {
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
  
  console.log('[PageContentAPI] 📤 Full request body:', JSON.stringify(bodyData, null, 2));

  const response = await apiClient<NoteContent>(
    `/api/notes/${noteId}/content`,
    {
      method: 'POST',
      body: JSON.stringify(bodyData),
    },
  );

  console.log('[PageContentAPI] ✅ Note content saved');
  return response;
}

/**
 * Get entire note content (all pages)
 */
export async function getNoteContent(
  noteId: string,
): Promise<NoteContent> {
  console.log('[PageContentAPI] Loading note content:', { noteId });

  const response = await apiClient<NoteContent>(
    `/api/notes/${noteId}/content`,
    {
      method: 'GET',
    },
  );

  console.log('[PageContentAPI] ✅ Note content loaded:', {
    pageCount: Object.keys(response.pages || {}).length,
  });
  
  // Debug: Log the loaded data
  const firstPageKey = Object.keys(response.pages || {})[0];
  if (firstPageKey && response.pages[firstPageKey]) {
    const firstPage = response.pages[firstPageKey];
    console.log(`[PageContentAPI] 📥 Received from backend - First page (${firstPageKey}):`, {
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
 * Delete entire note content
 */
export async function deleteNoteContent(
  noteId: string,
): Promise<void> {
  console.log('[PageContentAPI] Deleting note content:', { noteId });

  await apiClient<void>(
    `/api/notes/${noteId}/content`,
    {
      method: 'DELETE',
    },
  );

  console.log('[PageContentAPI] ✅ Note content deleted');
}

