/**
 * Link Registry
 * Centralized storage for HAL links across the application
 * 
 * Features:
 * - Stores links from API responses
 * - Provides quick access to resource links
 * - Supports hierarchical link storage (resource -> action)
 * - Auto-expires stale links
 */

import { createLogger } from "@/lib/utils/logger";
import { HalLink, HalLinks, HalResource, getLink, expandTemplate } from "./types";
import { getApiBaseUrl, discoverApi } from "./api-discovery";

const log = createLogger("LinkRegistry");

// Types
interface StoredLink {
  link: HalLink;
  timestamp: number;
  resourceId?: string;
}

interface ResourceLinks {
  self: HalLink;
  actions: Map<string, HalLink>;
  timestamp: number;
}

// Registry state
const rootLinks = new Map<string, StoredLink>();
const resourceLinks = new Map<string, ResourceLinks>();
const LINK_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Initialize registry with root API links
 */
export async function initializeLinkRegistry(): Promise<void> {
  try {
    const links = await discoverApi();
    
    for (const [rel, link] of Object.entries(links)) {
      if (link) {
        const linkData = Array.isArray(link) ? link[0] : link;
        rootLinks.set(rel, {
          link: linkData,
          timestamp: Date.now(),
        });
      }
    }
    
    log.info("Link registry initialized", {
      linkCount: rootLinks.size,
    });
  } catch (error) {
    log.error("Failed to initialize link registry", error);
  }
}

/**
 * Store links from a HAL resource response
 */
export function storeResourceLinks(
  resourceType: string,
  resourceId: string,
  resource: HalResource
): void {
  const key = `${resourceType}:${resourceId}`;
  const self = getLink(resource, "self");
  
  if (!self) {
    log.warn(`Resource ${key} has no self link`);
    return;
  }

  const actions = new Map<string, HalLink>();
  
  for (const [rel, link] of Object.entries(resource._links)) {
    if (rel !== "self" && link) {
      const linkData = Array.isArray(link) ? link[0] : link;
      actions.set(rel, linkData);
    }
  }

  resourceLinks.set(key, {
    self,
    actions,
    timestamp: Date.now(),
  });

  log.debug(`Stored links for ${key}`, {
    actionCount: actions.size,
  });
}

/**
 * Get a root-level link
 */
export function getRootLink(rel: string): HalLink | undefined {
  const stored = rootLinks.get(rel);
  
  if (!stored) return undefined;
  
  // Check if expired
  if (Date.now() - stored.timestamp > LINK_TTL) {
    rootLinks.delete(rel);
    return undefined;
  }
  
  return stored.link;
}

/**
 * Get a resource's self link
 */
export function getResourceSelfLink(
  resourceType: string,
  resourceId: string
): HalLink | undefined {
  const key = `${resourceType}:${resourceId}`;
  const stored = resourceLinks.get(key);
  
  if (!stored) return undefined;
  
  // Check if expired
  if (Date.now() - stored.timestamp > LINK_TTL) {
    resourceLinks.delete(key);
    return undefined;
  }
  
  return stored.self;
}

/**
 * Get a resource's action link
 */
export function getResourceActionLink(
  resourceType: string,
  resourceId: string,
  action: string
): HalLink | undefined {
  const key = `${resourceType}:${resourceId}`;
  const stored = resourceLinks.get(key);
  
  if (!stored) return undefined;
  
  // Check if expired
  if (Date.now() - stored.timestamp > LINK_TTL) {
    resourceLinks.delete(key);
    return undefined;
  }
  
  return stored.actions.get(action);
}

/**
 * Build URL from stored link
 */
export function buildLinkUrl(
  link: HalLink,
  params?: Record<string, string | number>
): string {
  let href = link.href;
  
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
 * Get URL for a root link
 */
export async function getRootUrl(
  rel: string,
  params?: Record<string, string | number>
): Promise<string | undefined> {
  let link = getRootLink(rel);
  
  // Try to refresh if not found
  if (!link) {
    await initializeLinkRegistry();
    link = getRootLink(rel);
  }
  
  if (!link) return undefined;
  
  return buildLinkUrl(link, params);
}

/**
 * Get URL for a resource action
 */
export function getResourceUrl(
  resourceType: string,
  resourceId: string,
  action?: string,
  params?: Record<string, string | number>
): string | undefined {
  const link = action
    ? getResourceActionLink(resourceType, resourceId, action)
    : getResourceSelfLink(resourceType, resourceId);
  
  if (!link) return undefined;
  
  return buildLinkUrl(link, params);
}

/**
 * Clear all stored links
 */
export function clearLinkRegistry(): void {
  rootLinks.clear();
  resourceLinks.clear();
  log.debug("Link registry cleared");
}

/**
 * Clear links for a specific resource
 */
export function clearResourceLinks(resourceType: string, resourceId: string): void {
  const key = `${resourceType}:${resourceId}`;
  resourceLinks.delete(key);
  log.debug(`Cleared links for ${key}`);
}

/**
 * Get all available root relations
 */
export function getAvailableRootLinks(): string[] {
  return Array.from(rootLinks.keys());
}

/**
 * Get all available actions for a resource
 */
export function getAvailableResourceActions(
  resourceType: string,
  resourceId: string
): string[] {
  const key = `${resourceType}:${resourceId}`;
  const stored = resourceLinks.get(key);
  
  if (!stored) return [];
  
  return Array.from(stored.actions.keys());
}

// ==========================================
// Link Helpers for common patterns
// ==========================================

/**
 * Create a templated link pattern
 */
export function createTemplatedLink(
  baseHref: string,
  template: string
): HalLink {
  return {
    href: `${baseHref}${template}`,
    templated: true,
  };
}

/**
 * Common link patterns
 */
export const LinkPatterns = {
  // Notes
  note: (noteId: string) => `notes:${noteId}`,
  noteContent: (noteId: string, pageId: string) => `notes/${noteId}/content/${pageId}`,
  
  // Folders  
  folder: (folderId: string) => `folders:${folderId}`,
  
  // Users
  user: (userId: string) => `users:${userId}`,
  currentUser: () => "users:me",
  
  // Recordings
  recording: (recordingId: string) => `recordings:${recordingId}`,
  
  // Transcription
  session: (sessionId: string) => `transcription:${sessionId}`,
};

