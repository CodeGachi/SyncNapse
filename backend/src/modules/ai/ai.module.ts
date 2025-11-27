import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [DbModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

