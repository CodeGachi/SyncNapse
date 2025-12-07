import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardController } from './dashboard.controller';
import { UsersController } from './users.controller';
import { PlansController } from './plans.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { MonitoringController } from './monitoring.controller';
import { SettingsController } from './settings.controller';
import { AdminService } from './admin.service';
import { DashboardService } from './dashboard.service';
import { UsersService } from './users.service';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { MonitoringService } from './monitoring.service';
import { SettingsService } from './settings.service';

@Module({
  controllers: [
    AdminController,
    DashboardController,
    UsersController,
    PlansController,
    SubscriptionsController,
    MonitoringController,
    SettingsController,
  ],
  providers: [
    AdminService,
    DashboardService,
    UsersService,
    PlansService,
    SubscriptionsService,
    MonitoringService,
    SettingsService,
  ],
  exports: [
    AdminService,
    DashboardService,
    UsersService,
    PlansService,
    SubscriptionsService,
    MonitoringService,
    SettingsService,
  ],
})
export class AdminModule {}

