import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { logout as logoutApi } from "../auth.api";

export function useLogin(
  options?: UseMutationOptions<
    { accessToken: string; refreshToken: string; user: any },
    Error,
    { accessToken: string; refreshToken: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
      localStorage.setItem("authToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      try {
        const parts = accessToken.split(".");
        const decoded = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        return {
          accessToken,
          refreshToken,
          user: {
            id: decoded.sub || decoded.id,
            email: decoded.email || "",
            name: decoded.name || "User",
          },
        };
      } catch {
        return { accessToken, refreshToken, user: {} };
      }
    },
    onSuccess: (data) => {
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
