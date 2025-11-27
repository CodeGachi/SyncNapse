import { Module } from '@nestjs/common';
import { LiveblocksService } from './liveblocks.service';
import { LiveblocksController } from './liveblocks.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [LiveblocksService],
  controllers: [LiveblocksController],
  exports: [LiveblocksService],
})
export class LiveblocksModule {}
