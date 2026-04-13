import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { VpnModule } from '../vpn/vpn.module';

@Module({
  imports: [PrismaModule, UsersModule, VpnModule],
  providers: [BotService],
})
export class BotModule {}