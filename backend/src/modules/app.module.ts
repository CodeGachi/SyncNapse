import { Module } from '@nestjs/common';
import { DbModule } from '../modules/db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoggingModule } from './logging/logging.module';
import { HypermediaModule } from './hypermedia/hypermedia.module';
import { RootController } from './root.controller';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    DbModule,
    UsersModule,
    AuthModule,
    LoggingModule,
    HypermediaModule,
    SessionsModule,
  ],
  controllers: [RootController],
})
export class AppModule {}
