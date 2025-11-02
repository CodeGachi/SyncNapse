import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { exchangeCodeForToken, logout as logoutApi } from "../auth.api";

export function useLogin(
  options?: UseMutationOptions<
    { token: string; user: any },
    Error,
    { code: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const response = await exchangeCodeForToken(code);
      return response;
    },
    onSuccess: (data) => {
      /*
      *localStorage.setItem("authToken", data.token);
      *localStorage.setItem("user", JSON.stringify(data.user));
      *
      *document.cookie = `authToken=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
      */
      // Handled on the backend for security reasons
      queryClient.setQueryData(["auth", "currentUser"], data.user);
    },
    ...options,
  });
}

export function useLogout(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await logoutApi();
    },
    onSuccess: () => {
      
      queryClient.clear();
    },
    ...options,
  });
}
