import { Module } from '@nestjs/common';
import { DbModule } from '../modules/db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoggingModule } from './logging/logging.module';
import { HypermediaModule } from './hypermedia/hypermedia.module';
import { RootController } from './root.controller';
import { ExportsModule } from './exports/exports.module';
import { DevicesModule } from './devices/devices.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { FoldersModule } from './folders/folders.module';
import { NotesModule } from './notes/notes.module';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './uploads/uploads.module';
import { QueueModule } from './queue/queue.module';
import { AudioModule } from './audio/audio.module';
import { FilesModule } from './files/files.module';
import { TypingModule } from './typing/typing.module';
import { SearchModule } from './search/search.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // Global limit: 100 requests per minute per IP
    }]),
    DbModule,
    UsersModule,
    AuthModule,
    LoggingModule,
    HypermediaModule,
    ExportsModule,
    DevicesModule,
    WebrtcModule,
    FoldersModule,
    NotesModule,
    StorageModule,
    TranscriptionModule,
    UploadsModule,
    QueueModule,
    AudioModule,
    FilesModule,
    TypingModule,
    SearchModule,
  ],
  controllers: [RootController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
