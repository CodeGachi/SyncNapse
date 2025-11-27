import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { AudioProcessor } from './processors/audio.processor';
import { TranscriptionModule } from '../transcription/transcription.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    forwardRef(() => TranscriptionModule),
    StorageModule,
  ],
  providers: [QueueService, AudioProcessor],
  exports: [QueueService],
})
export class QueueModule {}

