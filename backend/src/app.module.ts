import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PlansModule } from './plans/plans.module';
import { UsersModule } from './users/users.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { VpnModule } from './vpn/vpn.module';
import { BotModule } from './bot/bot.module';
import { DeployModule } from './deploy/deploy.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    PlansModule,
    UsersModule,
    SubscriptionsModule,
    VpnModule,
    BotModule,
    DeployModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}