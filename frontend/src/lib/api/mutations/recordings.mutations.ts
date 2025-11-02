/**
 * Recording Related TanStack Query Mutations
 *
 * Recording save/delete/rename operations using useMutation hooks
 */
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  saveRecording as saveRecordingApi,
  deleteRecording as deleteRecordingApi,
  renameRecording as renameRecordingApi,
} from "../services/recordings.api";
import type { DBRecording } from "@/lib/db/recordings";

/**
 * Recording save mutation
 *
 * @example
 * const saveRecording = useSaveRecording({
 *   onSuccess: () => {
 *     notify.success("저장 완료", "녹음이 저장되었습니다.");
 *   },
 * });
 *
 * saveRecording.mutate({ noteId, name, recordingBlob, duration });
 */
export function useSaveRecording(
  options?: {
    onSuccess?: (data: DBRecording) => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      noteId,
      name,
      recordingBlob,
      duration,
    }: {
      noteId: string;
      name: string;
      recordingBlob: Blob;
      duration: number;
    }) => saveRecordingApi(noteId, name, recordingBlob, duration),

    onSuccess: (data, variables) => {
      // Invalidate relevant note's recording list
      queryClient.invalidateQueries({
        queryKey: ["recordings", "note", variables.noteId],
      });

      options?.onSuccess?.(data);
    },

    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Recording delete mutation
 *
 * @example
 * const deleteRecording = useDeleteRecording({
 *   onSuccess: () => {
 *     notify.success("삭제 완료", "녹음이 삭제되었습니다.");
 *   },
 * });
 *
 * deleteRecording.mutate({ recordingId, noteId });
 */
export function useDeleteRecording(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordingId }: { recordingId: string; noteId: string }) =>
      deleteRecordingApi(recordingId),

    // Optimistic Update
    onMutate: async ({ recordingId, noteId }) => {
      await queryClient.cancelQueries({
        queryKey: ["recordings", "note", noteId],
      });

      const previousRecordings = queryClient.getQueryData<DBRecording[]>([
        "recordings",
        "note",
        noteId,
      ]);

      if (previousRecordings) {
        queryClient.setQueryData<DBRecording[]>(
          ["recordings", "note", noteId],
          previousRecordings.filter((rec) => rec.id !== recordingId)
        );
      }

      return { previousRecordings };
    },

    onError: (error, variables, context: any) => {
      if (context?.previousRecordings) {
        queryClient.setQueryData(
          ["recordings", "note", variables.noteId],
          context.previousRecordings
        );
      }

      options?.onError?.(error);
    },

    onSuccess: (_, variables) => {
      // Invalidate relevant note's recording list
      queryClient.invalidateQueries({
        queryKey: ["recordings", "note", variables.noteId],
      });

      options?.onSuccess?.();
    },
  });
}

/**
 * Recording rename mutation
 *
 * @example
 * const renameRecording = useRenameRecording({
 *   onSuccess: () => {
 *     notify.success("변경 완료", "녹음 이름이 변경되었습니다.");
 *   },
 * });
 *
 * renameRecording.mutate({ recordingId, newName, noteId });
 */
export function useRenameRecording(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordingId,
      newName,
    }: {
      recordingId: string;
      newName: string;
      noteId: string;
    }) => renameRecordingApi(recordingId, newName),

    // Optimistic Update
    onMutate: async ({ recordingId, newName, noteId }) => {
      await queryClient.cancelQueries({
        queryKey: ["recordings", "note", noteId],
      });

      const previousRecordings = queryClient.getQueryData<DBRecording[]>([
        "recordings",
        "note",
        noteId,
      ]);

      if (previousRecordings) {
        queryClient.setQueryData<DBRecording[]>(
          ["recordings", "note", noteId],
          previousRecordings.map((rec) =>
            rec.id === recordingId ? { ...rec, name: newName } : rec
          )
        );
      }

      return { previousRecordings };
    },

    onError: (error, variables, context: any) => {
      if (context?.previousRecordings) {
        queryClient.setQueryData(
          ["recordings", "note", variables.noteId],
          context.previousRecordings
        );
      }

      options?.onError?.(error);
    },

    onSuccess: (_, variables) => {
      // Invalidate relevant note's recording list
      queryClient.invalidateQueries({
        queryKey: ["recordings", "note", variables.noteId],
      });

      options?.onSuccess?.();
    },
  });
}
