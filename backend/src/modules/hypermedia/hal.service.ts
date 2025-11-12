import { Injectable } from '@nestjs/common';
import { LinkBuilderService } from './link-builder.service';
import { HalResource, HalCollection, HalLinks, HalEmbedded, CollectionLinkParams, PaginationParams } from './types';

@Injectable()
export class HalService {
  constructor(private readonly links: LinkBuilderService) {}

  //  Create a HAL resource with links and optional embedded resources
  resource<T extends Record<string, unknown>>(
    data: T,
    links: Partial<HalLinks>,
    embedded?: HalEmbedded,
  ): HalResource<T> {
    const result = {
      ...data,
      _links: {
        self: links.self || { href: '' },
        ...links,
      } as HalLinks,
    } as HalResource<T>;

    if (embedded && Object.keys(embedded).length > 0) {
      result._embedded = embedded;
    }

    return result;
  }

  //  Create a HAL collection with pagination support
  collection<T extends Record<string, unknown>>(
    items: T[],
    params: CollectionLinkParams<T>,
    pagination?: PaginationParams,
  ): HalCollection<T> {
    const itemResources = items.map((item) => ({
      ...item,
      _links: {
        self: this.links.self(params.itemSelfHref(item)),
      },
    })) as HalResource<T>[];

    const collectionLinks: HalLinks = {
      self: this.links.self(params.selfHref),
      ...params.extraLinks,
    };

    if (params.nextHref) {
      collectionLinks.next = this.links.self(params.nextHref);
    }
    if (params.prevHref) {
      collectionLinks.prev = this.links.self(params.prevHref);
    }
    if (params.firstHref) {
      collectionLinks.first = this.links.self(params.firstHref);
    }
    if (params.lastHref) {
      collectionLinks.last = this.links.self(params.lastHref);
    }

    const collection: HalCollection<T> = {
      count: items.length,
      items: itemResources,
      _links: collectionLinks,
    };

    if (pagination) {
      collection.page = pagination.page;
      collection.pageSize = pagination.limit;
      collection.total = pagination.total;
    }

    return collection;
  }

  //  Create an empty collection
  emptyCollection<T>(selfHref: string): HalCollection<T> {
    return {
      count: 0,
      items: [],
      _links: {
        self: this.links.self(selfHref),
      },
    };
  }

  //  Wrap error response in HAL format
  error(message: string, statusCode: number, details?: Record<string, unknown>): HalResource {
    return {
      error: {
        message,
        statusCode,
        ...details,
      },
      _links: {
        self: { href: '' },
      },
    };
  }
}