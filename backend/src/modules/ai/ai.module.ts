import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { RagEngineService } from './services/rag-engine.service';
import { BM25SearchService } from './services/bm25-search.service';
import { HybridSearchService } from './services/hybrid-search.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [
    AiService,
    RagEngineService,
    BM25SearchService,
    HybridSearchService,
  ],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
