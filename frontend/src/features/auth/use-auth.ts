/**
 * 인증 상태 관리 훅
 * localStorage 기반으로 로그인 상태 추적
 */

"use client";

import { useState, useEffect } from "react";
import type { User } from "@/lib/api/auth.api";
import { mockGetCurrentUser } from "@/lib/mock/auth.mock";
// import { getCurrentUser } from "@/lib/api/auth.api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (USE_MOCK) {
          // Mock: localStorage에서 사용자 정보 로드
          const currentUser = await mockGetCurrentUser();
          setUser(currentUser);
        } else {
          // Real: 백엔드 API 호출
          const token = localStorage.getItem("authToken");
          if (token) {
            // const currentUser = await getCurrentUser();
            // setUser(currentUser);

            // 임시: localStorage에서 사용자 정보 파싱
            const userStr = localStorage.getItem("user");
            if (userStr) {
              setUser(JSON.parse(userStr));
            }
          }
        }
      } catch (err) {
        console.error("사용자 정보 로드 실패:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}
