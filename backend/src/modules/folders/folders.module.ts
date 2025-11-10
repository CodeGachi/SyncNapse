import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DbModule, StorageModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}

