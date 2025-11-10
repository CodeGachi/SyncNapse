import { Module } from '@nestjs/common';
import { DbModule } from '../modules/db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoggingModule } from './logging/logging.module';
import { HypermediaModule } from './hypermedia/hypermedia.module';
import { RootController } from './root.controller';
import { ExportsModule } from './exports/exports.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { LiveSessionsModule } from './live-sessions/live-sessions.module';

@Module({
  imports: [
    DbModule,
    UsersModule,
    AuthModule,
    LoggingModule,
    HypermediaModule,
    ExportsModule,
    BookmarksModule,
    LiveSessionsModule,
  ],
  controllers: [RootController],
})
export class AppModule {}
