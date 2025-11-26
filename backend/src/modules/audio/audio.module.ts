import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [DbModule, StorageModule, LoggingModule],
  controllers: [AudioController],
  providers: [AudioService],
  exports: [AudioService],
})
export class AudioModule {}

