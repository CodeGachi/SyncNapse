import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { RagEngineService } from './services/rag-engine.service';

@Module({
  providers: [AiService, RagEngineService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
