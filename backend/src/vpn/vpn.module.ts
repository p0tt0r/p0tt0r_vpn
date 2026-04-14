import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SshModule } from '../ssh/ssh.module';
import { VpnService } from './vpn.service';
import { VpnSyncService } from './vpn-sync.service';
import { VpnController } from './vpn.controller';

@Module({
  imports: [PrismaModule, SshModule],
  providers: [VpnService, VpnSyncService],
  controllers: [VpnController],
  exports: [VpnService],
})
export class VpnModule {}