import { Module } from '@nestjs/common';
import { PostprocessService } from './postprocess.service';

@Module({
  providers: [PostprocessService],
  exports: [PostprocessService],
})
export class PostprocessModule {}
