import { Module } from '@nestjs/common';
import { WebrtcGateway } from './webrtc.gateway';
import { WebrtcService } from './webrtc.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [WebrtcGateway, WebrtcService],
  exports: [WebrtcService],
})
export class WebrtcModule {}