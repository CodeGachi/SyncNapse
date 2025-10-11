import { Injectable } from '@nestjs/common';

@Injectable()
export class LinkBuilderService {
  self(href: string) { return { href }; }
  action(href: string, method: string) { return { href, method }; }
  up(href: string) { return { href }; }
  templated(href: string) { return { href, templated: true as const }; }
}
