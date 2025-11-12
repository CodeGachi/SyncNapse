import { Module } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { DbModule } from '../db/db.module';
import { HypermediaModule } from '../hypermedia/hypermedia.module';

@Module({
  imports: [DbModule, HypermediaModule],
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService],
  exports: [LiveSessionsService],
})
export class LiveSessionsModule {}

