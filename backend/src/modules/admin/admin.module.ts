import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardController } from './dashboard.controller';
import { AdminService } from './admin.service';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [AdminController, DashboardController],
  providers: [AdminService, DashboardService],
  exports: [AdminService, DashboardService],
})
export class AdminModule {}

