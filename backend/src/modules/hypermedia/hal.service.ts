import { Injectable } from '@nestjs/common';
import { LinkBuilderService } from './link-builder.service';

type Links = Record<string, { href: string; method?: string; templated?: boolean }>;

@Injectable()
export class HalService {
  constructor(private readonly links: LinkBuilderService) {}

  resource<T extends Record<string, unknown>>(data: T, links: Links, embedded?: Record<string, unknown>) {
    const result: Record<string, unknown> = { ...data, _links: links };
    if (embedded && Object.keys(embedded).length > 0) {
      result._embedded = embedded;
    }
    return result;
  }

  collection<T extends Record<string, unknown>>(
    items: T[],
    params: {
      selfHref: string;
      itemSelfHref: (item: T) => string;
      nextHref?: string;
      prevHref?: string;
      extraLinks?: Links;
    },
  ) {
    const itemResources = items.map((item) => ({
      ...item,
      _links: { self: this.links.self(params.itemSelfHref(item)) },
    }));

    const links: Links = { self: this.links.self(params.selfHref) };
    if (params.nextHref) links.next = this.links.self(params.nextHref);
    if (params.prevHref) links.prev = this.links.self(params.prevHref);
    if (params.extraLinks) Object.assign(links, params.extraLinks);

    return { count: items.length, items: itemResources, _links: links };
  }
}
