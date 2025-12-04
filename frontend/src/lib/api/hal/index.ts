/**
 * HAL (Hypertext Application Language) Module
 * HATEOAS implementation for SyncNapse
 * 
 * Usage:
 * 
 * ```typescript
 * import { halClient, halGet, followLink, initializeLinkRegistry } from '@/lib/api/hal';
 * 
 * // Initialize at app start
 * await initializeLinkRegistry();
 * 
 * // Use HAL client for navigation
 * const client = new HalClient();
 * const root = await client.root();
 * const notes = await client.follow('notes');
 * const note = await client.follow('item', { id: 'note-123' });
 * 
 * // Or use convenience functions
 * const notes = await halGet('notes');
 * const noteDetail = await followLink(notes, 'self');
 * ```
 */

// Types (explicit type exports for TypeScript isolatedModules)
export type { HalLink, HalLinks, HalEmbedded, HalResource, HalCollection } from './types';
export type { HttpMethod } from './types';
export {
  isHalResource,
  isHalCollection,
  extractData,
  getLink,
  getLinks,
  expandTemplate,
} from './types';

// API Discovery (explicit type export)
export type { ApiRootResponse } from './api-discovery';
export {
  getApiBaseUrl,
  discoverApi,
  getApiLink,
  getApiHref,
  clearApiCache,
  isApiDiscovered,
  buildUrl,
  // Synchronous functions (for modules that can't use async)
  getCachedLink,
  getCachedHref,
} from './api-discovery';

// HAL Client (explicit type export)
export type { HalRequestConfig } from './hal-client';
export {
  HalClient,
  HalError,
  halGet,
  halPost,
  followLink,
  performAction,
  halFetchUrl,
  halClient,
} from './hal-client';

// Link Registry
export {
  initializeLinkRegistry,
  storeResourceLinks,
  getRootLink,
  getResourceSelfLink,
  getResourceActionLink,
  buildLinkUrl,
  getRootUrl,
  getResourceUrl,
  clearLinkRegistry,
  clearResourceLinks,
  getAvailableRootLinks,
  getAvailableResourceActions,
  createTemplatedLink,
  LinkPatterns,
} from './link-registry';
