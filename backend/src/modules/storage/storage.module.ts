import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageTestController } from './storage-test.controller';
import { DbModule } from '../db/db.module';

@Global()
@Module({
  imports: [DbModule],
  providers: [StorageService],
  controllers: [StorageTestController],
  exports: [StorageService],
})
export class StorageModule {}

