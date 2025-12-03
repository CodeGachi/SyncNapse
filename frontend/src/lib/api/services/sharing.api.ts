/**
 * Sharing API Service
 * 노트 공유 설정 및 협업자 관리 API
 */

import { API_BASE_URL, getAuthHeaders } from "../client";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("SharingAPI");

// 공개 접근 레벨
export type PublicAccess = "PRIVATE" | "PUBLIC_READ" | "PUBLIC_EDIT";

// 협업자 권한
export type NotePermission = "VIEWER" | "EDITOR";

// 협업자 정보
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

// 노트 공유 정보
export interface NoteSharingInfo {
  id: string;
  title: string;
  publicAccess: PublicAccess;
  collaborators: Collaborator[];
}

/**
 * 공개 접근 설정 변경
 * @param noteId 노트 ID
 * @param publicAccess 공개 접근 레벨
 */
export async function updatePublicAccess(
  noteId: string,
  publicAccess: PublicAccess
): Promise<{ id: string; publicAccess: PublicAccess }> {
  log.debug(`Updating public access for note ${noteId}:`, publicAccess);

  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/public-access`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ publicAccess }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to update public access" }));
    log.error("Failed to update public access:", error);
    throw new Error(error.message || "공개 설정 변경에 실패했습니다");
  }

  const result = await res.json();
  log.info(`Public access updated for note ${noteId}:`, result.publicAccess);
  return result;
}

/**
 * 협업자 목록 조회
 * @param noteId 노트 ID
 */
export async function getCollaborators(noteId: string): Promise<Collaborator[]> {
  log.debug(`Fetching collaborators for note ${noteId}`);

  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/collaborators`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to fetch collaborators" }));
    log.error("Failed to fetch collaborators:", error);
    throw new Error(error.message || "협업자 목록을 불러오는데 실패했습니다");
  }

  const collaborators = await res.json();
  log.debug(`Fetched ${collaborators.length} collaborators for note ${noteId}`);
  return collaborators;
}

/**
 * 협업자 초대 (이메일)
 * @param noteId 노트 ID
 * @param email 초대할 이메일
 * @param permission 권한 (기본: VIEWER)
 */
export async function inviteCollaborator(
  noteId: string,
  email: string,
  permission: NotePermission = "VIEWER"
): Promise<Collaborator> {
  log.debug(`Inviting collaborator to note ${noteId}:`, { email, permission });

  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/collaborators`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ email, permission }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to invite collaborator" }));
    log.error("Failed to invite collaborator:", error);

    // 이미 초대된 사용자 에러 처리
    if (res.status === 409) {
      throw new Error("이미 초대된 사용자입니다");
    }
    throw new Error(error.message || "협업자 초대에 실패했습니다");
  }

  const collaborator = await res.json();
  log.info(`Collaborator invited to note ${noteId}:`, collaborator.email);
  return collaborator;
}

/**
 * 협업자 권한 변경
 * @param noteId 노트 ID
 * @param collaboratorId 협업자 ID
 * @param permission 새 권한
 */
export async function updateCollaboratorPermission(
  noteId: string,
  collaboratorId: string,
  permission: NotePermission
): Promise<Collaborator> {
  log.debug(`Updating collaborator permission:`, { noteId, collaboratorId, permission });

  const res = await fetch(
    `${API_BASE_URL}/api/notes/${noteId}/collaborators/${collaboratorId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ permission }),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to update permission" }));
    log.error("Failed to update collaborator permission:", error);
    throw new Error(error.message || "권한 변경에 실패했습니다");
  }

  const collaborator = await res.json();
  log.info(`Collaborator permission updated:`, { collaboratorId, permission });
  return collaborator;
}

/**
 * 협업자 제거
 * @param noteId 노트 ID
 * @param collaboratorId 협업자 ID
 */
export async function removeCollaborator(
  noteId: string,
  collaboratorId: string
): Promise<{ success: boolean }> {
  log.debug(`Removing collaborator:`, { noteId, collaboratorId });

  const res = await fetch(
    `${API_BASE_URL}/api/notes/${noteId}/collaborators/${collaboratorId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to remove collaborator" }));
    log.error("Failed to remove collaborator:", error);
    throw new Error(error.message || "협업자 제거에 실패했습니다");
  }

  log.info(`Collaborator removed:`, collaboratorId);
  return { success: true };
}

/**
 * 공유 링크 생성 헬퍼
 * @param noteId 노트 ID
 */
export function generateShareLink(noteId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/shared/${noteId}`;
}

/**
 * 실시간 협업 링크 생성 헬퍼
 * @param noteId 노트 ID
 */
export function generateCollaborationLink(noteId: string): string {
  if (typeof window === "undefined") return "";
  // 토큰 형식: {noteId}-{timestamp}-{random}
  const token = `${noteId}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  return `${window.location.origin}/shared/${token}`;
}

// 복사된 노트 응답 타입
export interface CopiedNote {
  id: string;
  title: string;
  type: string;
  folder_id: string;
  public_access: PublicAccess;
  created_at: string;
  updated_at: string;
}

/**
 * 공유된 노트를 내 폴더로 복사
 * @param noteId 복사할 노트 ID
 * @param options 복사 옵션 (폴더 ID, 커스텀 제목)
 */
export async function copyNoteToMyFolder(
  noteId: string,
  options?: { folderId?: string; title?: string }
): Promise<CopiedNote> {
  log.debug(`Copying note ${noteId} to my folder`, options);

  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/copy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      folderId: options?.folderId,
      title: options?.title,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to copy note" }));
    log.error("Failed to copy note:", error);
    throw new Error(error.message || "노트 복사에 실패했습니다");
  }

  const copiedNote = await res.json();
  log.info(`Note copied successfully:`, copiedNote.id);
  return copiedNote;
}
