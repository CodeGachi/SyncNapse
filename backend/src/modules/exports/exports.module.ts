import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}


