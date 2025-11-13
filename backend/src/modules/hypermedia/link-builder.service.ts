import { Injectable } from '@nestjs/common';
import { HalLink, HttpMethod } from './types';

@Injectable()
export class LinkBuilderService {
  /**
   * Create a self link
   */
  self(href: string): HalLink {
    return { href };
  }

  /**
   * Create an action link with HTTP method
   */
  action(href: string, method: HttpMethod): HalLink {
    return { href, method };
  }

  /**
   * Create an "up" link (parent resource)
   */
  up(href: string): HalLink {
    return { href };
  }

  /**
   * Create a templated link (RFC 6570 URI Template)
   */
  templated(href: string): HalLink {
    return { href, templated: true };
  }

  /**
   * Create a custom link with all options
   */
  link(href: string, options?: Partial<Omit<HalLink, 'href'>>): HalLink {
    return { href, ...options };
  }

  /**
   * Create pagination links
   */
  pagination(params: {
    baseUrl: string;
    page: number;
    pageSize: number;
    totalPages: number;
  }): {
    self: HalLink;
    first?: HalLink;
    prev?: HalLink;
    next?: HalLink;
    last?: HalLink;
  } {
    const { baseUrl, page, pageSize, totalPages } = params;
    const links: ReturnType<LinkBuilderService['pagination']> = {
      self: this.self(`${baseUrl}?page=${page}&limit=${pageSize}`),
    };

    if (totalPages > 1) {
      links.first = this.self(`${baseUrl}?page=1&limit=${pageSize}`);
      links.last = this.self(`${baseUrl}?page=${totalPages}&limit=${pageSize}`);
    }

    if (page > 1) {
      links.prev = this.self(`${baseUrl}?page=${page - 1}&limit=${pageSize}`);
    }

    if (page < totalPages) {
      links.next = this.self(`${baseUrl}?page=${page + 1}&limit=${pageSize}`);
    }

    return links;
  }
}