/**
 * 공유 링크 returnUrl 관리 유틸리티
 * 로그인 후 공유 링크로 복귀하기 위한 URL 저장/조회
 */

// 공유 링크 returnUrl을 localStorage에 저장하는 키
const SHARED_RETURN_URL_KEY = "syncnapse_shared_return_url";

/**
 * 공유 링크 URL을 localStorage에 저장
 */
export function saveSharedReturnUrl(url: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHARED_RETURN_URL_KEY, url);
}

/**
 * 로그인 후 저장된 공유 링크 URL을 가져오고 삭제
 * 로그인 성공 후 호출하여 원래 공유 링크로 복귀
 */
export function getAndClearSharedReturnUrl(): string | null {
  if (typeof window === "undefined") return null;

  const url = localStorage.getItem(SHARED_RETURN_URL_KEY);
  if (url) {
    localStorage.removeItem(SHARED_RETURN_URL_KEY);
  }
  return url;
}
