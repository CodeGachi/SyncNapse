/**
 * Token Manager - JWT 토큰 관리
 *
 * - Access Token 저장/가져오기
 * - Refresh Token 저장/가져오기
 * - 토큰 갱신
 * - 토큰 유효성 검사
 */

const ACCESS_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * Access Token 저장
 */
export function setAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

/**
 * Access Token 가져오기
 */
export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return null;
}

/**
 * Refresh Token 저장
 */
export function setRefreshToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

/**
 * Refresh Token 가져오기
 */
export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

/**
 * 모든 토큰 제거 (로그아웃)
 */
export function clearTokens(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/**
 * JWT 토큰 디코드 (페이로드 추출)
 */
export function decodeToken(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

/**
 * 토큰 만료 여부 확인
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();

  return currentTime >= expirationTime;
}

/**
 * 토큰이 곧 만료되는지 확인 (Proactive Refresh용)
 * @param token JWT 토큰
 * @param bufferSeconds 만료 전 여유 시간 (기본 60초)
 */
export function isTokenExpiringSoon(token: string, bufferSeconds: number = 60): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const bufferMs = bufferSeconds * 1000;

  // 만료 시간 - 버퍼 시간보다 현재 시간이 크면 곧 만료
  return currentTime >= expirationTime - bufferMs;
}

/**
 * 토큰 갱신 진행 중인지 추적 (Race Condition 방지)
 */
let refreshPromise: Promise<string | null> | null = null;

/**
 * Access Token 갱신 (Refresh Token Rotation 지원)
 * - Race Condition 방지: 동시 요청 시 하나의 Promise 공유
 * - 새 Refresh Token도 저장 (백엔드 Rotation 정책)
 */
export async function refreshAccessToken(): Promise<string | null> {
  // 이미 갱신 중이면 기존 Promise 반환 (Race Condition 방지)
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = performRefresh();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.warn("[TokenManager] No refresh token available");
    return null;
  }

  try {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: refreshToken,  // 백엔드 스펙: camelCase
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();

    // 백엔드 응답 스펙: { accessToken, refreshToken, expiresIn }
    const newAccessToken = data.accessToken;
    const newRefreshToken = data.refreshToken;

    if (!newAccessToken) {
      throw new Error("No access token in response");
    }

    // 새 토큰들 저장 (Rotation: 새 Refresh Token도 저장)
    setAccessToken(newAccessToken);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }

    console.log("[TokenManager] Tokens refreshed successfully");
    return newAccessToken;
  } catch (error) {
    console.error("[TokenManager] Token refresh failed:", error);
    // 갱신 실패 시 모든 토큰 제거
    clearTokens();
    return null;
  }
}

/**
 * 유효한 Access Token 가져오기 (Proactive Refresh 포함)
 * - 만료 60초 전에 미리 갱신하여 요청 실패 방지
 */
export async function getValidAccessToken(): Promise<string | null> {
  let accessToken = getAccessToken();

  // Access Token이 없으면 null 반환
  if (!accessToken) {
    return null;
  }

  // 이미 만료된 경우 갱신 필수
  if (isTokenExpired(accessToken)) {
    console.log("[TokenManager] Access token expired, refreshing...");
    accessToken = await refreshAccessToken();
    return accessToken;
  }

  // 곧 만료될 예정이면 미리 갱신 (Proactive Refresh)
  if (isTokenExpiringSoon(accessToken, 60)) {
    console.log("[TokenManager] Access token expiring soon, proactive refresh...");
    // 갱신 실패해도 현재 토큰 반환 (아직 유효함)
    const newToken = await refreshAccessToken();
    return newToken || accessToken;
  }

  return accessToken;
}

/**
 * 인증 헤더 생성
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getValidAccessToken();

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  return {};
}
