import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SshModule } from '../ssh/ssh.module';
import { VpnService } from './vpn.service';
import { VpnSyncService } from './vpn-sync.service';

@Module({
  imports: [PrismaModule, SshModule],
  providers: [VpnService, VpnSyncService],
  exports: [VpnService],
})
export class VpnModule {}