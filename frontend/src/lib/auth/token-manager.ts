/**
 * Token Manager - JWT 토큰 관리 (쿠키 기반) - HATEOAS
 *
 * - Access Token 저장/가져오기
 * - Refresh Token 저장/가져오기
 * - 토큰 갱신 (HATEOAS - getCachedHref 사용)
 * - 토큰 유효성 검사
 * 
 * Note: Uses getCachedHref (sync) to avoid circular dependency with HAL client
 */

import { getCookie, setCookie, deleteCookie } from "@/lib/utils/cookie";
import { createLogger } from "@/lib/utils/logger";
import { getCachedHref } from "@/lib/api/hal/api-discovery";

const log = createLogger("TokenManager");

const ACCESS_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// 토큰 만료 시간 (초)
const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7일
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30일

/**
 * Access Token 저장
 */
export function setAccessToken(token: string): void {
  setCookie(ACCESS_TOKEN_KEY, token, ACCESS_TOKEN_MAX_AGE);
}

/**
 * Access Token 가져오기
 */
export function getAccessToken(): string | null {
  return getCookie(ACCESS_TOKEN_KEY);
}

/**
 * Refresh Token 저장
 */
export function setRefreshToken(token: string): void {
  setCookie(REFRESH_TOKEN_KEY, token, REFRESH_TOKEN_MAX_AGE);
}

/**
 * Refresh Token 가져오기
 */
export function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_KEY);
}

/**
 * 모든 토큰 제거 (로그아웃)
 */
export function clearTokens(): void {
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
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
    log.error("Failed to decode token:", error);
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
 * Access Token 갱신
 * - Race Condition 방지: 동시 요청 시 하나의 Promise 공유
 * - Refresh Token은 httpOnly 쿠키로 관리 (백엔드가 자동 갱신)
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
  try {
    // HATEOAS: Get refresh URL from cached links (sync to avoid circular dependency)
    const refreshUrl = getCachedHref("refresh");

    log.debug("Attempting token refresh");

    // Try httpOnly cookie first (same-origin via nginx)
    // Fallback to X-Refresh-Token header for cross-origin (dev without nginx)
    const refreshToken = getRefreshToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // If we have refresh token in JS-accessible cookie, send via header (cross-origin fallback)
    if (refreshToken) {
      headers["X-Refresh-Token"] = refreshToken;
    }

    const response = await fetch(refreshUrl, {
      method: "POST",
      headers,
      credentials: "include", // httpOnly cookie auto-sent when same-origin
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();

    const newAccessToken = data.accessToken;
    if (!newAccessToken) {
      throw new Error("No access token in response");
    }

    // 새 토큰 저장
    setAccessToken(newAccessToken);
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }

    log.info("Access token refreshed successfully");
    return newAccessToken;
  } catch (error) {
    log.error("Token refresh failed:", error);
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

  // Access Token이 없으면 refresh 시도
  // Note: httpOnly 쿠키는 JS에서 읽을 수 없으므로 무조건 시도
  if (!accessToken) {
    log.debug("No access token, attempting refresh...");
    accessToken = await refreshAccessToken();
    return accessToken;
  }

  // 이미 만료된 경우 갱신 필수
  if (isTokenExpired(accessToken)) {
    log.debug("Access token expired, refreshing...");
    accessToken = await refreshAccessToken();
    return accessToken;
  }

  // 곧 만료될 예정이면 미리 갱신 (Proactive Refresh)
  if (isTokenExpiringSoon(accessToken, 60)) {
    log.debug("Access token expiring soon, proactive refresh...");
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
