import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { RagEngineService } from './services/rag-engine.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [AiService, RagEngineService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
