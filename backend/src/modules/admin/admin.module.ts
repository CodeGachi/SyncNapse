import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardController } from './dashboard.controller';
import { UsersController } from './users.controller';
import { AdminService } from './admin.service';
import { DashboardService } from './dashboard.service';
import { UsersService } from './users.service';

@Module({
  controllers: [AdminController, DashboardController, UsersController],
  providers: [AdminService, DashboardService, UsersService],
  exports: [AdminService, DashboardService, UsersService],
})
export class AdminModule {}

