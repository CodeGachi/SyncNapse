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
import { DevicesModule } from './devices/devices.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { FoldersModule } from './folders/folders.module';
import { NotesModule } from './notes/notes.module';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './uploads/uploads.module';

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
    DevicesModule,
    WebrtcModule,
    FoldersModule,
    NotesModule,
    StorageModule,
    TranscriptionModule,
    UploadsModule,
  ],
  controllers: [RootController],
})
export class AppModule {}
