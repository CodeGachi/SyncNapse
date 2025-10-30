import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { DbModule } from '../db/db.module';
import { SecurityModule } from '../security/security.module';
import { PostprocessModule } from '../postprocess/postprocess.module';

@Module({
  imports: [DbModule, SecurityModule, PostprocessModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
