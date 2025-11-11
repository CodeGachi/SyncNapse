import { Module, forwardRef } from '@nestjs/common';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [DbModule, StorageModule, forwardRef(() => NotesModule)],
  controllers: [TranscriptionController],
  providers: [TranscriptionService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
