import { Module, forwardRef } from '@nestjs/common';
import { TypingController } from './typing.controller';
import { TypingService } from './typing.service';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';
import { NotesModule } from '../notes/notes.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [DbModule, StorageModule, LoggingModule, forwardRef(() => NotesModule)],
  controllers: [TypingController],
  providers: [TypingService],
  exports: [TypingService],
})
export class TypingModule {}

