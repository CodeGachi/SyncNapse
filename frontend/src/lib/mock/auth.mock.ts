/**
 * Mock 인증 서비스
 * 백엔드가 없을 때 개발용으로 사용
 * 실제 백엔드 연동 시 이 파일만 교체하면 됨
 */

import type { User, LoginResponse } from "../api/auth.api";

// Mock 사용자 데이터
const MOCK_USER: User = {
  id: "mock-user-123",
  email: "test@example.com",
  name: "테스트 사용자",
  picture: "https://via.placeholder.com/150",
  createdAt: new Date().toISOString(),
};

/**
 * Mock Google 로그인
 * 실제로는 팝업창이 아닌 즉시 로그인 처리
 */
export async function mockGoogleLogin(): Promise<LoginResponse> {
  // 2초 딜레이 (실제 API처럼)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock 토큰 생성
  const token = `mock-jwt-token-${Date.now()}`;

  // localStorage에 토큰 저장
  localStorage.setItem("authToken", token);
  localStorage.setItem("user", JSON.stringify(MOCK_USER));

  // 쿠키에도 토큰 저장 (middleware에서 사용)
  document.cookie = `authToken=${token}; path=/; max-age=86400`; // 24시간

  return {
    user: MOCK_USER,
    token,
  };
}

/**
 * Mock 사용자 정보 조회
 */
export async function mockGetCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  return JSON.parse(userStr);
}

/**
 * Mock 로그아웃
 */
export async function mockLogout(): Promise<void> {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");

  // 쿠키에서도 토큰 제거
  document.cookie = "authToken=; path=/; max-age=0";
}

/**
 * Mock 토큰 검증
 */
export async function mockVerifyToken(token: string): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    user: MOCK_USER,
    token,
  };
}
