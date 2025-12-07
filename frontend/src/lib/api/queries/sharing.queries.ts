/**
 * 공유 설정 관련 TanStack Query Queries & Mutations
 *
 * 노트 공유 설정 및 협업자 관리를 위한 React Query 훅들
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  getCollaborators,
  inviteCollaborator,
  updateCollaboratorPermission,
  removeCollaborator,
  updatePublicAccess,
  updateAllowedDomains,
  type Collaborator,
  type PublicAccess,
  type NotePermission,
} from "../services/sharing.api";

/**
 * 협업자 목록 조회
 *
 * @example
 * const { data: collaborators, isLoading } = useCollaborators("note-123");
 */
export function useCollaborators(
  noteId: string | null | undefined,
  options?: Omit<UseQueryOptions<Collaborator[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["collaborators", noteId],
    queryFn: () => getCollaborators(noteId!),
    enabled: !!noteId,
    staleTime: 1000 * 30, // 30초간 fresh
    gcTime: 1000 * 60 * 5, // 5분간 캐시 유지
    ...options,
  });
}

/**
 * 공개 설정 변경 Mutation
 *
 * @example
 * const mutation = useUpdatePublicAccess();
 * mutation.mutate({ noteId: "note-123", publicAccess: "PUBLIC_READ" });
 */
export function useUpdatePublicAccess(
  options?: UseMutationOptions<
    { id: string; publicAccess: PublicAccess },
    Error,
    { noteId: string; publicAccess: PublicAccess }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, publicAccess }) =>
      updatePublicAccess(noteId, publicAccess),
    onSuccess: (data, { noteId }) => {
      // 노트 캐시 업데이트
      queryClient.invalidateQueries({ queryKey: ["notes", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    ...options,
  });
}

/**
 * 허용 도메인 설정 변경 Mutation
 *
 * @example
 * const mutation = useUpdateAllowedDomains();
 * mutation.mutate({ noteId: "note-123", domains: ["ajou.ac.kr", "samsung.com"] });
 */
export function useUpdateAllowedDomains(
  options?: UseMutationOptions<
    { id: string; allowedDomains: string[] },
    Error,
    { noteId: string; domains: string[] }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, domains }) =>
      updateAllowedDomains(noteId, domains),
    onSuccess: (data, { noteId }) => {
      // 노트 캐시 업데이트
      queryClient.invalidateQueries({ queryKey: ["notes", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    ...options,
  });
}

/**
 * 협업자 초대 Mutation
 *
 * @example
 * const mutation = useInviteCollaborator();
 * mutation.mutate({
 *   noteId: "note-123",
 *   email: "user@example.com",
 *   permission: "VIEWER"
 * });
 */
export function useInviteCollaborator(
  options?: UseMutationOptions<
    Collaborator,
    Error,
    { noteId: string; email: string; permission?: NotePermission }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, email, permission }) =>
      inviteCollaborator(noteId, email, permission),
    onSuccess: (_, { noteId }) => {
      // 협업자 목록 갱신
      queryClient.invalidateQueries({ queryKey: ["collaborators", noteId] });
    },
    ...options,
  });
}

/**
 * 협업자 권한 변경 Mutation
 *
 * @example
 * const mutation = useUpdateCollaboratorPermission();
 * mutation.mutate({
 *   noteId: "note-123",
 *   collaboratorId: "collab-456",
 *   permission: "EDITOR"
 * });
 */
export function useUpdateCollaboratorPermission(
  options?: UseMutationOptions<
    Collaborator,
    Error,
    { noteId: string; collaboratorId: string; permission: NotePermission }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, collaboratorId, permission }) =>
      updateCollaboratorPermission(noteId, collaboratorId, permission),
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", noteId] });
    },
    ...options,
  });
}

/**
 * 협업자 제거 Mutation
 *
 * @example
 * const mutation = useRemoveCollaborator();
 * mutation.mutate({ noteId: "note-123", collaboratorId: "collab-456" });
 */
export function useRemoveCollaborator(
  options?: UseMutationOptions<
    { success: boolean },
    Error,
    { noteId: string; collaboratorId: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, collaboratorId }) =>
      removeCollaborator(noteId, collaboratorId),
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", noteId] });
    },
    ...options,
  });
}
