/**
 * HAL Client
 * HATEOAS-aware HTTP client that follows hypermedia links
 * 
 * Key features:
 * - Automatically parses HAL responses
 * - Follows _links for navigation
 * - Caches resources for efficiency
 * - Supports link templating
 */

import { createLogger } from "@/lib/utils/logger";
import { getAccessToken, getValidAccessToken } from "@/lib/auth/token-manager";
import {
  HalResource,
  HalCollection,
  HalLink,
  HalLinks,
  isHalResource,
  isHalCollection,
  getLink,
  getLinks,
  expandTemplate,
  extractData,
} from "./types";
import { getApiBaseUrl, discoverApi, buildUrl } from "./api-discovery";

const log = createLogger("HALClient");

// Request configuration
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;

export interface HalRequestConfig {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  skipAuth?: boolean;
}

// Cache for resources
const resourceCache = new Map<string, { data: HalResource; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * HAL-aware fetch wrapper
 */
async function halFetch<T extends HalResource>(
  url: string,
  options?: RequestInit,
  config?: HalRequestConfig
): Promise<T> {
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const skipAuth = config?.skipAuth ?? false;

  // Get auth token
  const token = skipAuth ? null : await getValidAccessToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/hal+json, application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new HalError(
        errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    
    log.debug(`HAL Response: ${options?.method || "GET"} ${url}`, {
      hasLinks: "_links" in data,
      hasEmbedded: "_embedded" in data,
    });

    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Custom error class for HAL operations
 */
export class HalError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HalError";
  }
}

/**
 * HAL Client class for navigating hypermedia APIs
 */
export class HalClient {
  private baseUrl: string;
  private currentResource: HalResource | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl();
  }

  /**
   * Start from the API root
   */
  async root(): Promise<HalResource> {
    const links = await discoverApi();
    this.currentResource = { _links: links as HalLinks };
    return this.currentResource;
  }

  /**
   * Follow a link relation from the current resource
   */
  async follow<T extends HalResource>(
    rel: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    if (!this.currentResource) {
      await this.root();
    }

    const link = getLink(this.currentResource!, rel);
    if (!link) {
      throw new HalError(`Link not found: ${rel}`, 404);
    }

    let href = link.href;
    if (link.templated && params) {
      href = expandTemplate(href, params);
    }

    // Make href absolute if relative
    if (!href.startsWith("http")) {
      href = `${this.baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
    }

    const method = link.method || "GET";
    const response = await halFetch<T>(href, { method });
    
    if (isHalResource(response)) {
      this.currentResource = response;
    }

    return response;
  }

  /**
   * Perform an action on a link (POST, PUT, PATCH, DELETE)
   */
  async action<T extends HalResource>(
    rel: string,
    body?: unknown,
    params?: Record<string, string | number>
  ): Promise<T> {
    if (!this.currentResource) {
      throw new HalError("No current resource. Call root() or follow() first.", 400);
    }

    const link = getLink(this.currentResource, rel);
    if (!link) {
      throw new HalError(`Action link not found: ${rel}`, 404);
    }

    let href = link.href;
    if (link.templated && params) {
      href = expandTemplate(href, params);
    }

    if (!href.startsWith("http")) {
      href = `${this.baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
    }

    const method = link.method || "POST";
    const response = await halFetch<T>(href, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (isHalResource(response)) {
      this.currentResource = response;
    }

    return response;
  }

  /**
   * Get the current resource
   */
  getCurrent(): HalResource | null {
    return this.currentResource;
  }

  /**
   * Get available links from current resource
   */
  getAvailableLinks(): string[] {
    if (!this.currentResource) return [];
    return Object.keys(this.currentResource._links);
  }

  /**
   * Check if a link is available
   */
  hasLink(rel: string): boolean {
    return this.currentResource?._links[rel] !== undefined;
  }

  /**
   * Reset client state
   */
  reset(): void {
    this.currentResource = null;
  }
}

// ==========================================
// Convenience functions for common operations
// ==========================================

/**
 * GET a resource by following links from root
 */
export async function halGet<T extends HalResource>(
  rel: string,
  params?: Record<string, string | number>,
  config?: HalRequestConfig
): Promise<T> {
  const links = await discoverApi();
  const linkData = links[rel];
  const link = Array.isArray(linkData) ? linkData[0] : linkData;
  
  if (!link) {
    throw new HalError(`Link not found: ${rel}`, 404);
  }

  let href = link.href;
  if (link.templated && params) {
    href = expandTemplate(href, params);
  }

  const baseUrl = getApiBaseUrl();
  if (!href.startsWith("http")) {
    href = `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
  }

  return halFetch<T>(href, { method: "GET" }, config);
}

/**
 * POST to a resource
 */
export async function halPost<T extends HalResource>(
  rel: string,
  body: unknown,
  params?: Record<string, string | number>,
  config?: HalRequestConfig
): Promise<T> {
  const links = await discoverApi();
  const linkData = links[rel];
  const link = Array.isArray(linkData) ? linkData[0] : linkData;
  
  if (!link) {
    throw new HalError(`Link not found: ${rel}`, 404);
  }

  let href = link.href;
  if (link.templated && params) {
    href = expandTemplate(href, params);
  }

  const baseUrl = getApiBaseUrl();
  if (!href.startsWith("http")) {
    href = `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
  }

  return halFetch<T>(href, {
    method: link.method || "POST",
    body: JSON.stringify(body),
  }, config);
}

/**
 * Follow a link from a HAL resource
 */
export async function followLink<T extends HalResource>(
  resource: HalResource,
  rel: string,
  params?: Record<string, string | number>,
  config?: HalRequestConfig
): Promise<T> {
  const link = getLink(resource, rel);
  if (!link) {
    throw new HalError(`Link not found: ${rel}`, 404);
  }

  let href = link.href;
  if (link.templated && params) {
    href = expandTemplate(href, params);
  }

  const baseUrl = getApiBaseUrl();
  if (!href.startsWith("http")) {
    href = `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
  }

  return halFetch<T>(href, { method: link.method || "GET" }, config);
}

/**
 * Perform an action on a HAL resource
 */
export async function performAction<T extends HalResource>(
  resource: HalResource,
  rel: string,
  body?: unknown,
  params?: Record<string, string | number>,
  config?: HalRequestConfig
): Promise<T> {
  const link = getLink(resource, rel);
  if (!link) {
    throw new HalError(`Action link not found: ${rel}`, 404);
  }

  let href = link.href;
  if (link.templated && params) {
    href = expandTemplate(href, params);
  }

  const baseUrl = getApiBaseUrl();
  if (!href.startsWith("http")) {
    href = `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
  }

  return halFetch<T>(href, {
    method: link.method || "POST",
    body: body ? JSON.stringify(body) : undefined,
  }, config);
}

/**
 * Direct URL fetch with HAL support
 * For cases where you have a full URL (e.g., from _links)
 */
export async function halFetchUrl<T extends HalResource>(
  url: string,
  options?: RequestInit,
  config?: HalRequestConfig
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  return halFetch<T>(fullUrl, options, config);
}

// Default client instance
export const halClient = new HalClient();

