import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { DbModule } from '../db/db.module';
import { HypermediaModule } from '../hypermedia/hypermedia.module';

@Module({
  imports: [DbModule, HypermediaModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}

