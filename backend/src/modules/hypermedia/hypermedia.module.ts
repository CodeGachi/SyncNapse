import { Global, Module } from '@nestjs/common';
import { LinkBuilderService } from './link-builder.service';
import { ApiLinksService } from './api-links.service';
import { HalService } from './hal.service';
import { HalExceptionFilter } from './hal-exception.filter';

@Global()
@Module({
  providers: [LinkBuilderService, ApiLinksService, HalService, HalExceptionFilter],
  exports: [LinkBuilderService, ApiLinksService, HalService, HalExceptionFilter],
})
export class HypermediaModule {}
