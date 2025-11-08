/**
 * Token Manager - JWT 토큰 관리
 *
 * - Access Token 저장/가져오기
 * - Refresh Token 저장/가져오기
 * - 토큰 갱신
 * - 토큰 유효성 검사
 */

const ACCESS_TOKEN_KEY = "syncnapse_access_token";
const REFRESH_TOKEN_KEY = "syncnapse_refresh_token";

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
 * Access Token 갱신
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.warn("No refresh token available");
    return null;
  }

  try {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    const newAccessToken = data.access_token;

    // 새 Access Token 저장
    setAccessToken(newAccessToken);

    return newAccessToken;
  } catch (error) {
    console.error("Token refresh failed:", error);
    // 갱신 실패 시 모든 토큰 제거
    clearTokens();
    return null;
  }
}

/**
 * 유효한 Access Token 가져오기 (자동 갱신 포함)
 */
export async function getValidAccessToken(): Promise<string | null> {
  let accessToken = getAccessToken();

  // Access Token이 없으면 null 반환
  if (!accessToken) {
    return null;
  }

  // Access Token이 만료되었으면 갱신 시도
  if (isTokenExpired(accessToken)) {
    console.log("Access token expired, attempting refresh...");
    accessToken = await refreshAccessToken();
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
