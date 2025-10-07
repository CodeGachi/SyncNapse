import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DbModule } from '../modules/db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [DbModule, HealthModule, UsersModule, AuthModule, LoggingModule],
})
export class AppModule {}
