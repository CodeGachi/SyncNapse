/**
 * Sharing API Service (HATEOAS)
 * 노트 공유 설정 및 협업자 관리 API
 * Uses HAL links for API navigation
 */

import { createLogger } from "@/lib/utils/logger";
import { 
  getRootUrl, 
  halFetchUrl, 
  HalResource,
  HalError,
  storeResourceLinks,
} from "../hal";

const log = createLogger("SharingAPI");

// Types
export type PublicAccess = "PRIVATE" | "PUBLIC_READ" | "PUBLIC_EDIT";
export type NotePermission = "VIEWER" | "EDITOR";

export interface Collaborator {
  id: string;
  noteId: string;
  email: string;
  userId?: string | null;
  permission: NotePermission;
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    displayName?: string;
    authProvider?: string;
  } | null;
}

export interface NoteSharingInfo {
  id: string;
  title: string;
  publicAccess: PublicAccess;
  collaborators: Collaborator[];
}

export interface CopiedNote {
  id: string;
  title: string;
  type: string;
  folder_id: string;
  public_access: PublicAccess;
  created_at: string;
  updated_at: string;
}

// HAL Resource types
interface PublicAccessResource extends HalResource {
  id: string;
  publicAccess: PublicAccess;
}

interface CollaboratorResource extends HalResource, Collaborator {}

interface CollaboratorsListResource extends HalResource {
  items: CollaboratorResource[];
}

interface CopiedNoteResource extends HalResource, CopiedNote {}

// ==========================================
// URL Builders (HATEOAS)
// ==========================================

async function getNotePublicAccessUrl(noteId: string): Promise<string> {
  // Try templated link first
  const url = await getRootUrl("notePublicAccess", { noteId });
  if (url) return url;
  
  // Fallback: construct from notes base
  const notesUrl = await getRootUrl("notes");
  return notesUrl ? `${notesUrl}/${noteId}/public-access` : `/notes/${noteId}/public-access`;
}

async function getNoteCollaboratorsUrl(noteId: string): Promise<string> {
  // Try templated link first
  const url = await getRootUrl("noteCollaborators", { noteId });
  if (url) return url;
  
  // Fallback: construct from notes base
  const notesUrl = await getRootUrl("notes");
  return notesUrl ? `${notesUrl}/${noteId}/collaborators` : `/notes/${noteId}/collaborators`;
}

async function getCollaboratorUrl(noteId: string, collaboratorId: string): Promise<string> {
  const collaboratorsUrl = await getNoteCollaboratorsUrl(noteId);
  return `${collaboratorsUrl}/${collaboratorId}`;
}

async function getNoteCopyUrl(noteId: string): Promise<string> {
  const notesUrl = await getRootUrl("notes");
  return notesUrl ? `${notesUrl}/${noteId}/copy` : `/notes/${noteId}/copy`;
}

// ==========================================
// Sharing API Functions (HATEOAS)
// ==========================================

/**
 * Update public access setting
 */
export async function updatePublicAccess(
  noteId: string,
  publicAccess: PublicAccess
): Promise<{ id: string; publicAccess: PublicAccess }> {
  log.debug(`Updating public access for note ${noteId}:`, publicAccess);

  try {
    const url = await getNotePublicAccessUrl(noteId);
    const response = await halFetchUrl<PublicAccessResource>(url, {
      method: "PATCH",
      body: JSON.stringify({ publicAccess }),
    });

    log.info(`Public access updated for note ${noteId}:`, response.publicAccess);
    return { id: response.id, publicAccess: response.publicAccess };
  } catch (error) {
    log.error("Failed to update public access:", error);
    if (error instanceof HalError) {
      throw new Error(error.message || "공개 설정 변경에 실패했습니다");
    }
    throw error;
  }
}

/**
 * Update allowed domains for domain-based sharing
 */
export async function updateAllowedDomains(
  noteId: string,
  domains: string[]
): Promise<{ id: string; allowedDomains: string[] }> {
  log.debug(`Updating allowed domains for note ${noteId}:`, domains);

  try {
    const notesUrl = await getRootUrl("notes");
    const url = notesUrl ? `${notesUrl}/${noteId}/allowed-domains` : `/notes/${noteId}/allowed-domains`;
    
    const response = await halFetchUrl<HalResource & { id: string; allowedDomains: string[] }>(url, {
      method: "PATCH",
      body: JSON.stringify({ domains }),
    });

    log.info(`Allowed domains updated for note ${noteId}:`, response.allowedDomains);
    return { id: response.id, allowedDomains: response.allowedDomains };
  } catch (error) {
    log.error("Failed to update allowed domains:", error);
    if (error instanceof HalError) {
      throw new Error(error.message || "도메인 설정 변경에 실패했습니다");
    }
    throw error;
  }
}

/**
 * Get collaborators list
 */
export async function getCollaborators(noteId: string): Promise<Collaborator[]> {
  log.debug(`Fetching collaborators for note ${noteId}`);

  try {
    const url = await getNoteCollaboratorsUrl(noteId);
    const response = await halFetchUrl<CollaboratorsListResource>(url, {
      method: "GET",
    });

    // Handle both array and HAL collection response
    const collaborators = Array.isArray(response) 
      ? response 
      : (response.items || response);
    
    log.debug(`Fetched ${(collaborators as Collaborator[]).length} collaborators for note ${noteId}`);
    return collaborators as Collaborator[];
  } catch (error) {
    log.error("Failed to fetch collaborators:", error);
    if (error instanceof HalError) {
      throw new Error(error.message || "협업자 목록을 불러오는데 실패했습니다");
    }
    throw error;
  }
}

/**
 * Invite collaborator by email
 */
export async function inviteCollaborator(
  noteId: string,
  email: string,
  permission: NotePermission = "VIEWER"
): Promise<Collaborator> {
  log.debug(`Inviting collaborator to note ${noteId}:`, { email, permission });

  try {
    const url = await getNoteCollaboratorsUrl(noteId);
    const response = await halFetchUrl<CollaboratorResource>(url, {
      method: "POST",
      body: JSON.stringify({ email, permission }),
    });

    // Store links from collaborator resource
    if (response._links) {
      storeResourceLinks("collaborator", response.id, response);
    }

    log.info(`Collaborator invited to note ${noteId}:`, response.email);
    return response;
  } catch (error) {
    log.error("Failed to invite collaborator:", error);
    if (error instanceof HalError) {
      if (error.status === 409) {
        throw new Error("이미 초대된 사용자입니다");
      }
      throw new Error(error.message || "협업자 초대에 실패했습니다");
    }
    throw error;
  }
}

/**
 * Update collaborator permission
 */
export async function updateCollaboratorPermission(
  noteId: string,
  collaboratorId: string,
  permission: NotePermission
): Promise<Collaborator> {
  log.debug(`Updating collaborator permission:`, { noteId, collaboratorId, permission });

  try {
    const url = await getCollaboratorUrl(noteId, collaboratorId);
    const response = await halFetchUrl<CollaboratorResource>(url, {
      method: "PATCH",
      body: JSON.stringify({ permission }),
    });

    log.info(`Collaborator permission updated:`, { collaboratorId, permission });
    return response;
  } catch (error) {
    log.error("Failed to update collaborator permission:", error);
    if (error instanceof HalError) {
      throw new Error(error.message || "권한 변경에 실패했습니다");
    }
    throw error;
  }
}

/**
 * Remove collaborator
 */
export async function removeCollaborator(
  noteId: string,
  collaboratorId: string
): Promise<{ success: boolean }> {
  log.debug(`Removing collaborator:`, { noteId, collaboratorId });

  try {
    const url = await getCollaboratorUrl(noteId, collaboratorId);
    await halFetchUrl<HalResource>(url, { method: "DELETE" });

    log.info(`Collaborator removed:`, collaboratorId);
    return { success: true };
  } catch (error) {
    log.error("Failed to remove collaborator:", error);
    if (error instanceof HalError) {
      throw new Error(error.message || "협업자 제거에 실패했습니다");
    }
    throw error;
  }
}

/**
 * Generate share link helper
 */
export function generateShareLink(noteId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/shared/${noteId}`;
}

/**
 * Generate collaboration link helper
 */
export function generateCollaborationLink(noteId: string): string {
  if (typeof window === "undefined") return "";
  const token = `${noteId}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  return `${window.location.origin}/shared/${token}`;
}

/**
 * Copy shared note to my folder
 */
export async function copyNoteToMyFolder(
  noteId: string,
  options?: { folderId?: string; title?: string }
): Promise<CopiedNote> {
  log.debug(`Copying note ${noteId} to my folder`, options);

  try {
    const url = await getNoteCopyUrl(noteId);
    const response = await halFetchUrl<CopiedNoteResource>(url, {
      method: "POST",
      body: JSON.stringify({
        folderId: options?.folderId,
        title: options?.title,
      }),
    });

    // Store links from copied note resource
    if (response._links) {
      storeResourceLinks("note", response.id, response);
    }

    log.info(`Note copied successfully:`, response.id);
    return response;
  } catch (error) {
    log.error("Failed to copy note:", error);
    if (error instanceof HalError) {
      throw new Error(error.message || "노트 복사에 실패했습니다");
    }
    throw error;
  }
}
