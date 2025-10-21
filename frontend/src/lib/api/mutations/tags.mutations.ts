/**
 * 태그 관련 TanStack Query Mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTagApi, updateTagApi, deleteTagApi } from "../tags.api";
import type { Tag } from "@/lib/types";

/**
 * 태그 생성 뮤테이션
 */
export function useCreateTag(options?: {
  onSuccess?: (data: Tag) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTagApi,
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.setQueryData(["tags", newTag.id], newTag);

      options?.onSuccess?.(newTag);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * 태그 수정 뮤테이션
 */
export function useUpdateTag(options?: {
  onSuccess?: (data: Tag) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tagId,
      updates,
    }: {
      tagId: string;
      updates: Partial<Omit<Tag, "id">>;
    }) => updateTagApi(tagId, updates),

    onMutate: async ({ tagId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["tags", tagId] });

      const previousTag = queryClient.getQueryData<Tag>(["tags", tagId]);

      if (previousTag) {
        queryClient.setQueryData<Tag>(["tags", tagId], {
          ...previousTag,
          ...updates,
        });
      }

      const previousTags = queryClient.getQueryData<Tag[]>(["tags"]);
      if (previousTags) {
        queryClient.setQueryData<Tag[]>(
          ["tags"],
          previousTags.map((tag) =>
            tag.id === tagId ? { ...tag, ...updates } : tag
          )
        );
      }

      return { previousTag, previousTags };
    },

    onError: (err: Error, variables, context: any) => {
      if (context?.previousTag) {
        queryClient.setQueryData(["tags", variables.tagId], context.previousTag);
      }
      if (context?.previousTags) {
        queryClient.setQueryData(["tags"], context.previousTags);
      }

      options?.onError?.(err);
    },

    onSuccess: (updatedTag) => {
      queryClient.setQueryData(["tags", updatedTag.id], updatedTag);
      queryClient.invalidateQueries({ queryKey: ["tags"] });

      options?.onSuccess?.(updatedTag);
    },
  });
}

/**
 * 태그 삭제 뮤테이션
 */
export function useDeleteTag(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTagApi,

    onMutate: async (tagId) => {
      await queryClient.cancelQueries({ queryKey: ["tags"] });

      const previousTags = queryClient.getQueryData<Tag[]>(["tags"]);

      if (previousTags) {
        queryClient.setQueryData<Tag[]>(
          ["tags"],
          previousTags.filter((tag) => tag.id !== tagId)
        );
      }

      queryClient.removeQueries({ queryKey: ["tags", tagId] });

      return { previousTags };
    },

    onError: (err: Error, tagId, context: any) => {
      if (context?.previousTags) {
        queryClient.setQueryData(["tags"], context.previousTags);
      }

      options?.onError?.(err);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] }); // 태그가 달린 노트도 갱신

      options?.onSuccess?.();
    },
  });
}
