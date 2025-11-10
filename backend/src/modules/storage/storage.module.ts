import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageTestController } from './storage-test.controller';

@Global()
@Module({
  providers: [StorageService],
  controllers: [StorageTestController],
  exports: [StorageService],
})
export class StorageModule {}

