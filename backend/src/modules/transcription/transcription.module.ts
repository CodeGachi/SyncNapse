import { Module, forwardRef } from '@nestjs/common';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';
import { NotesModule } from '../notes/notes.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [DbModule, StorageModule, QueueModule, forwardRef(() => NotesModule)],
  controllers: [TranscriptionController],
  providers: [TranscriptionService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
