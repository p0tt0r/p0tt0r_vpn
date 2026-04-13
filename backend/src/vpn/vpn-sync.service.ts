import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VpnService } from './vpn.service';

@Injectable()
export class VpnSyncService {
  private readonly logger = new Logger(VpnSyncService.name);

  constructor(private readonly vpnService: VpnService) {}

  @Cron('*/2 * * * *')
  async handleSync() {
    try {
      const expired = await this.vpnService.markExpiredSubscriptions();
      const activeCount = await this.vpnService.syncActiveClientsToServer();

      this.logger.log(
        `VPN sync done. expiredUpdated=${expired.count}, activeClients=${activeCount}`,
      );
    } catch (error) {
      this.logger.error('VPN sync failed', error as Error);
    }
  }
}