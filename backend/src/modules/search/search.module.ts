import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}

