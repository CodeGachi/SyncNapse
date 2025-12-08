/**
 * 휴지통 관련 TanStack Query 뮤테이션
 *
 * useMutation 훅을 사용한 휴지통 복원/삭제 작업
 */
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  restoreTrashItem as restoreTrashItemApi,
  permanentlyDeleteTrashItem as permanentlyDeleteTrashItemApi,
  emptyTrash as emptyTrashApi,
  cleanupExpiredTrashItems as cleanupExpiredTrashItemsApi,
} from "../services/trash.api";
import type { DBTrashItem } from "@/lib/db/trash";

/**
 * 휴지통 항목 복원 뮤테이션
 *
 * @example
 * const restoreItem = useRestoreTrashItem({
 *   onSuccess: () => {
 *     notify.success("복원이 완료되었습니다.");
 *   },
 * });
 *
 * restoreItem.mutate("item-123");
 */
export function useRestoreTrashItem(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreTrashItemApi,

    // Optimistic Update: Remove from UI immediately
    onMutate: async (itemId) => {
      // Cancel in-progress queries
      await queryClient.cancelQueries({ queryKey: ["trash"] });

      // Backup previous value
      const previousItems = queryClient.getQueryData<DBTrashItem[]>(["trash"]);

      // Optimistic Update: Remove from trash
      if (previousItems) {
        queryClient.setQueryData<DBTrashItem[]>(
          ["trash"],
          previousItems.filter((item) => item.id !== itemId)
        );
      }

      return { previousItems };
    },

    // Rollback on error
    onError: (err, itemId, context: any) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["trash"], context.previousItems);
      }

      options?.onError?.(err);
    },

    // Revalidate on success
    onSuccess: () => {
      // Revalidate trash, notes, and folders lists (restored item reflects)
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });

      options?.onSuccess?.();
    },
  });
}

/**
 * 휴지통 항목 영구 삭제 뮤테이션
 *
 * @example
 * const deleteItem = usePermanentlyDeleteTrashItem({
 *   onSuccess: () => {
 *     notify.success("영구 삭제가 완료되었습니다.");
 *   },
 * });
 *
 * deleteItem.mutate("item-123");
 */
export function usePermanentlyDeleteTrashItem(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permanentlyDeleteTrashItemApi,

    // Optimistic Update
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ["trash"] });

      const previousItems = queryClient.getQueryData<DBTrashItem[]>(["trash"]);

      if (previousItems) {
        queryClient.setQueryData<DBTrashItem[]>(
          ["trash"],
          previousItems.filter((item) => item.id !== itemId)
        );
      }

      return { previousItems };
    },

    onError: (err, itemId, context: any) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["trash"], context.previousItems);
      }

      options?.onError?.(err);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      options?.onSuccess?.();
    },
  });
}

/**
 * 휴지통 비우기 뮤테이션 (모든 항목 영구 삭제)
 *
 * @example
 * const emptyTrash = useEmptyTrash({
 *   onSuccess: () => {
 *     notify.success("휴지통이 비워졌습니다.");
 *   },
 * });
 *
 * emptyTrash.mutate();
 */
export function useEmptyTrash(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emptyTrashApi,

    // Optimistic Update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["trash"] });

      const previousItems = queryClient.getQueryData<DBTrashItem[]>(["trash"]);

      // Empty trash
      queryClient.setQueryData<DBTrashItem[]>(["trash"], []);

      return { previousItems };
    },

    onError: (err, variables, context: any) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["trash"], context.previousItems);
      }

      options?.onError?.(err);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      options?.onSuccess?.();
    },
  });
}

/**
 * 만료된 휴지통 항목 자동 삭제 뮤테이션
 *
 * @example
 * const cleanupExpired = useCleanupExpiredTrashItems();
 * cleanupExpired.mutate();
 */
export function useCleanupExpiredTrashItems(
  options?: {
    onSuccess?: (deletedCount: number) => void;
    onError?: (error: Error) => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cleanupExpiredTrashItemsApi,

    onSuccess: (deletedCount) => {
      // Re-query trash
      queryClient.invalidateQueries({ queryKey: ["trash"] });

      options?.onSuccess?.(deletedCount);
    },

    onError: (err) => {
      options?.onError?.(err);
    },
  });
}
