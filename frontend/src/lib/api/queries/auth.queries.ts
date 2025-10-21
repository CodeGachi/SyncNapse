import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getCurrentUser, verifyToken, type User } from "../auth.api";

/**
 * 현재 로그인한 사용자 정보 조회
 */
export function useCurrentUser(
  options?: Omit<UseQueryOptions<User | null, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return null;

      try {
        return await getCurrentUser();
      } catch (error) {
        // 토큰이 유효하지 않으면 null 반환
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    retry: false, // 인증 실패 시 재시도 안함
    ...options,
  });
}

/**
 * 토큰 검증
 */
export function useVerifyToken(token: string | null) {
  return useQuery({
    queryKey: ["auth", "verify", token],
    queryFn: () => {
      if (!token) throw new Error("No token");
      return verifyToken(token);
    },
    enabled: !!token,
    retry: false,
  });
}
