/**
 * HAL (Hypertext Application Language) Type Definitions
 * HATEOAS implementation for REST API
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HAL Link - represents a hypermedia link
 */
export interface HalLink {
  href: string;
  method?: HttpMethod;
  templated?: boolean;
  type?: string;
  hreflang?: string;
  title?: string;
  deprecation?: string;
  profile?: string;
  name?: string;
}

/**
 * Collection of HAL links indexed by relation type
 * Note: Index signature allows undefined for optional links
 */
export interface HalLinks {
  self: HalLink;
  [relation: string]: HalLink | HalLink[] | undefined;
}

/**
 * HAL embedded resources
 */
export interface HalEmbedded {
  [relation: string]: HalResource | HalResource[];
}

/**
 * Base HAL Resource with type safety
 */
export interface HalResource<T = Record<string, unknown>> {
  _links: HalLinks;
  _embedded?: HalEmbedded;
  [key: string]: unknown;
}

/**
 * HAL Collection Response
 */
export interface HalCollection<T = Record<string, unknown>> {
  count: number;
  total?: number;
  page?: number;
  pageSize?: number;
  items: HalResource<T>[];
  _links: HalLinks;
  _embedded?: HalEmbedded;
}

/**
 * Type guard to check if response is a HAL resource
 */
export function isHalResource(obj: unknown): obj is HalResource {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    '_links' in obj &&
    typeof (obj as HalResource)._links === 'object' &&
    'self' in (obj as HalResource)._links
  );
}

/**
 * Type guard to check if response is a HAL collection
 */
export function isHalCollection<T>(obj: unknown): obj is HalCollection<T> {
  if (!isHalResource(obj)) return false;
  const maybeCollection = obj as Record<string, unknown>;
  return 'items' in maybeCollection && Array.isArray(maybeCollection.items);
}

/**
 * Extract data from HAL resource (removes _links and _embedded)
 */
export function extractData<T>(resource: HalResource<T>): T {
  const { _links, _embedded, ...data } = resource;
  return data as T;
}

/**
 * Get link from HAL resource by relation
 */
export function getLink(resource: HalResource, rel: string): HalLink | undefined {
  const link = resource._links[rel];
  if (Array.isArray(link)) {
    return link[0];
  }
  return link;
}

/**
 * Get all links for a relation (for cases where multiple links exist)
 */
export function getLinks(resource: HalResource, rel: string): HalLink[] {
  const link = resource._links[rel];
  if (!link) return [];
  return Array.isArray(link) ? link : [link];
}

/**
 * Expand templated URI with parameters
 * Simple implementation - handles {param} style templates
 */
export function expandTemplate(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (uri, [key, value]) => uri.replace(`{${key}}`, String(value)),
    template
  );
}

