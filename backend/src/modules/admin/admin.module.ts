import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardController } from './dashboard.controller';
import { UsersController } from './users.controller';
import { PlansController } from './plans.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { AdminService } from './admin.service';
import { DashboardService } from './dashboard.service';
import { UsersService } from './users.service';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [
    AdminController,
    DashboardController,
    UsersController,
    PlansController,
    SubscriptionsController,
  ],
  providers: [
    AdminService,
    DashboardService,
    UsersService,
    PlansService,
    SubscriptionsService,
  ],
  exports: [
    AdminService,
    DashboardService,
    UsersService,
    PlansService,
    SubscriptionsService,
  ],
})
export class AdminModule {}

