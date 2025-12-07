/**
 * Devices Module
 * Handles trusted device registration and management
 */

import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}

