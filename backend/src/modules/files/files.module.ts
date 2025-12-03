import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageModule } from '../storage/storage.module';
import { DbModule } from '../db/db.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [DbModule, StorageModule, LoggingModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

