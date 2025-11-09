const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Subscribe to token refresh
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// Notify all subscribers when token is refreshed
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Refresh access token using refresh token
async function refreshToken(): Promise<string> {
  const refreshToken = localStorage.getItem("refreshToken");
  
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }
  
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    credentials: "include",
  });
  
  if (!response.ok) {
    // Refresh token도 만료됨 - 로그아웃 처리
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    throw new Error("Refresh token expired");
  }
  
  const data = await response.json();
  
  // Update tokens
  localStorage.setItem("authToken", data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
  }
  
  console.log("[ApiClient] ✅ Token refreshed successfully");
  
  return data.accessToken;
}

// API 요청 헬퍼 with automatic token refresh
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
  retryCount = 0
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get authentication headers for initial request
  const authHeaders = getAuthHeaders();
  const hasAuth = Object.keys(authHeaders).length > 0;
  console.log(`[ApiClient] 🔐 Request to ${endpoint} with auth:`, hasAuth ? 'Yes' : 'No');

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders, // Add authorization header to all requests
      ...options?.headers,
    },
    credentials: "include", // 쿠키 포함 (CORS)
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retryCount === 0 && !endpoint.includes("/auth/refresh")) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshToken();
        isRefreshing = false;
        onTokenRefreshed(newToken);
        
        // Retry the original request with new token
        const authHeaders = getAuthHeaders();
        return apiClient<T>(endpoint, {
          ...options,
          headers: {
            ...options?.headers,
            ...authHeaders,
          },
        }, 1);
      } else {
        // Wait for the token to be refreshed
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            const authHeaders = { Authorization: `Bearer ${token}` };
            apiClient<T>(endpoint, {
              ...options,
              headers: {
                ...options?.headers,
                ...authHeaders,
              },
            }, 1)
              .then(resolve)
              .catch(reject);
          });
        });
      }
    } catch (refreshError) {
      console.error("[ApiClient] ❌ Token refresh failed, redirecting to login");
      isRefreshing = false;
      
      // Save current URL (with query params) before redirecting to login
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (currentPath !== "/" && !currentPath.startsWith("/auth")) {
          localStorage.setItem("redirectAfterLogin", currentPath);
          console.log("[ApiClient] 💾 Saved redirect URL before login:", currentPath);
          // Also pass as query parameter for better UX
          window.location.href = `/?callbackUrl=${encodeURIComponent(currentPath)}`;
        } else {
          window.location.href = "/";
        }
      }
      
      throw refreshError;
    }
  }

  if (!response.ok) {
    const error: ApiError = {
      message: `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
    };

    try {
      const errorData = await response.json();
      error.message = errorData.message || error.message;
      error.code = errorData.code;
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    throw error;
  }

  return response.json();
}

// Authorization 헤더에 토큰 추가
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}