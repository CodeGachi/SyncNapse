/**
 * 쿠키 유틸리티
 * 브라우저 쿠키 읽기/쓰기/삭제
 */

/**
 * 쿠키 값 읽기
 * @param name 쿠키 이름
 * @returns 쿠키 값 또는 null
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

/**
 * 쿠키 설정
 * @param name 쿠키 이름
 * @param value 쿠키 값
 * @param maxAge 유효 시간 (초, 기본 7일)
 */
export function setCookie(
  name: string,
  value: string,
  maxAge: number = 60 * 60 * 24 * 7
): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

/**
 * 쿠키 삭제
 * @param name 쿠키 이름
 */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
}
