import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardController } from './dashboard.controller';
import { UsersController } from './users.controller';
import { PlansController } from './plans.controller';
import { AdminService } from './admin.service';
import { DashboardService } from './dashboard.service';
import { UsersService } from './users.service';
import { PlansService } from './plans.service';

@Module({
  controllers: [AdminController, DashboardController, UsersController, PlansController],
  providers: [AdminService, DashboardService, UsersService, PlansService],
  exports: [AdminService, DashboardService, UsersService, PlansService],
})
export class AdminModule {}

