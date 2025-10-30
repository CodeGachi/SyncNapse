export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

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

//  Collection of HAL links indexed by relation type
export interface HalLinks {
  self: HalLink;
  [relation: string]: HalLink | HalLink[];
}

//  HAL embedded resources
export interface HalEmbedded {
  [relation: string]: HalResource | HalResource[];
}

//  Base HAL Resource with type safety
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface HalResource<T = Record<string, unknown>> extends Record<string, unknown> {
  /** HAL links */
  _links: HalLinks;
  
  /** Embedded resources (optional) */
  _embedded?: HalEmbedded;
}

//  HAL Collection Response
export interface HalCollection<T = Record<string, unknown>> {
  count: number;
  total?: number;
  page?: number;
  pageSize?: number;
  items: HalResource<T>[];
  _links: HalLinks;
  _embedded?: HalEmbedded;
}

//  Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  total?: number;
}

//  Link builder parameters for collections
export interface CollectionLinkParams<T> {
  selfHref: string;
  itemSelfHref: (item: T) => string;
  nextHref?: string;
  prevHref?: string;
  firstHref?: string;
  lastHref?: string;
  extraLinks?: Partial<HalLinks>;
}