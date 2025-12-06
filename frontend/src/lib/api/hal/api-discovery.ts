/**
 * API Discovery Service
 * HATEOAS implementation - discovers API endpoints from root
 * 
 * Instead of hardcoding URLs, we fetch available links from the API root
 * and use them for subsequent requests.
 */

import { createLogger } from "@/lib/utils/logger";
import { HalResource, HalLink, getLink, expandTemplate } from "./types";

const log = createLogger("APIDiscovery");

// Root API response type
export interface ApiRootResponse extends HalResource {
  _links: {
    self: HalLink;
    login?: HalLink;
    profile?: HalLink;
    sessions?: HalLink;
    notes?: HalLink;
    folders?: HalLink;
    files?: HalLink;
    recordings?: HalLink;
    transcription?: HalLink;
    search?: HalLink;
    ai?: HalLink;
    liveblocks?: HalLink;
    [key: string]: HalLink | HalLink[] | undefined;
  };
}

// Singleton state
let rootLinks: ApiRootResponse["_links"] | null = null;
let discoveryPromise: Promise<ApiRootResponse["_links"]> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
}

/**
 * Discover API root and cache links
 * This should be called at app initialization
 */
export async function discoverApi(): Promise<ApiRootResponse["_links"]> {
  const now = Date.now();
  
  // Return cached if valid
  if (rootLinks && (now - lastFetchTime) < CACHE_TTL) {
    log.debug("Using cached API links");
    return rootLinks;
  }

  // Prevent concurrent discovery calls
  if (discoveryPromise) {
    log.debug("Discovery in progress, waiting...");
    return discoveryPromise;
  }

  discoveryPromise = (async () => {
    try {
      const baseUrl = getApiBaseUrl();
      log.info(`Discovering API at ${baseUrl}`);

      const response = await fetch(baseUrl, {
        method: "GET",
        headers: {
          "Accept": "application/hal+json, application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API discovery failed: ${response.status}`);
      }

      const data: ApiRootResponse = await response.json();
      
      if (!data._links) {
        throw new Error("Invalid API response: missing _links");
      }

      rootLinks = data._links;
      lastFetchTime = now;
      
      log.info("API discovered successfully", {
        availableLinks: Object.keys(rootLinks),
      });

      return rootLinks;
    } catch (error) {
      log.error("API discovery failed", error);
      // Return fallback links if discovery fails
      return getFallbackLinks();
    } finally {
      discoveryPromise = null;
    }
  })();

  return discoveryPromise;
}

/**
 * Get a specific link from discovered API
 */
export async function getApiLink(rel: string): Promise<HalLink | undefined> {
  const links = await discoverApi();
  const link = links[rel];
  
  if (Array.isArray(link)) {
    return link[0];
  }
  return link;
}

/**
 * Get link href, optionally expanding template parameters
 */
export async function getApiHref(
  rel: string,
  params?: Record<string, string | number>
): Promise<string | undefined> {
  const link = await getApiLink(rel);
  
  if (!link) {
    log.warn(`Link not found: ${rel}`);
    return undefined;
  }

  let href = link.href;
  
  // Expand template if needed
  if (link.templated && params) {
    href = expandTemplate(href, params);
  }

  return href;
}

/**
 * Clear cached links (useful for logout or error recovery)
 */
export function clearApiCache(): void {
  rootLinks = null;
  lastFetchTime = 0;
  discoveryPromise = null;
  log.debug("API cache cleared");
}

/**
 * Check if API has been discovered
 */
export function isApiDiscovered(): boolean {
  return rootLinks !== null && (Date.now() - lastFetchTime) < CACHE_TTL;
}

// ==========================================
// Synchronous functions (for avoiding circular dependencies)
// These use cached links or fallback - no async required
// ==========================================

/**
 * Get cached link synchronously (returns undefined if not cached)
 * Used by modules that can't use async (e.g., token-manager)
 */
export function getCachedLink(rel: string): HalLink | undefined {
  if (!rootLinks) {
    // Use fallback if not discovered yet
    const fallback = getFallbackLinks();
    const link = fallback[rel];
    return Array.isArray(link) ? link[0] : link;
  }
  
  const link = rootLinks[rel];
  return Array.isArray(link) ? link[0] : link;
}

/**
 * Get cached link href synchronously
 * Falls back to constructed URL if not cached
 */
export function getCachedHref(
  rel: string,
  params?: Record<string, string | number>
): string {
  const link = getCachedLink(rel);
  
  if (!link) {
    // Construct fallback URL
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/${rel}`;
  }

  let href = link.href;
  
  // Expand template if needed
  if (link.templated && params) {
    href = expandTemplate(href, params);
  }

  // Make absolute if relative
  if (!href.startsWith("http")) {
    const baseUrl = getApiBaseUrl();
    href = `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
  }

  return href;
}

/**
 * Get fallback links when discovery fails
 * This ensures the app can still function with hardcoded defaults
 * Note: Pure HATEOAS - only collection links, no templated resource links
 */
function getFallbackLinks(): ApiRootResponse["_links"] {
  const baseUrl = getApiBaseUrl();
  log.warn("Using fallback links");
  
  return {
    self: { href: baseUrl },
    login: { href: `${baseUrl}/auth/google`, method: "GET" },
    refresh: { href: `${baseUrl}/auth/refresh`, method: "POST" },
    logout: { href: `${baseUrl}/auth/logout`, method: "POST" },
    profile: { href: `${baseUrl}/users/me` },
    notes: { href: `${baseUrl}/notes` },
    trashedNotes: { href: `${baseUrl}/notes/trash/list` },
    folders: { href: `${baseUrl}/folders` },
    files: { href: `${baseUrl}/files` },
    recordings: { href: `${baseUrl}/recordings` },
    audioRecordings: { href: `${baseUrl}/audio/recordings` },
    transcription: { href: `${baseUrl}/transcription` },
    transcriptionSessions: { href: `${baseUrl}/transcription/sessions` },
    search: { href: `${baseUrl}/search` },
    ai: { href: `${baseUrl}/ai` },
    liveblocks: { href: `${baseUrl}/liveblocks` },
    auth: { href: `${baseUrl}/auth` },
  };
}

/**
 * Build a URL from base href and path segments
 */
export function buildUrl(baseHref: string, ...segments: (string | number)[]): string {
  const cleanBase = baseHref.replace(/\/$/, "");
  const cleanSegments = segments.map(s => String(s).replace(/^\/|\/$/g, ""));
  return [cleanBase, ...cleanSegments].join("/");
}

