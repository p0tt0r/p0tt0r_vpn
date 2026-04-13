import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { SshService } from '../ssh/ssh.service';

@Injectable()
export class VpnService {
  private readonly IP = '89.169.13.13';
  private readonly PUBLIC_KEY = 'CDCuL9OR80v0M8qo3HyYYpWOWNoiLe7RPaq4Jw9mRVA';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sshService: SshService,
  ) {}

  private buildLink(vpnUuid: string, label: string) {
    return (
      `vless://${vpnUuid}@${this.IP}:443` +
      `?encryption=none` +
      `&security=reality` +
      `&type=tcp` +
      `&sni=www.google.com` +
      `&fp=chrome` +
      `&pbk=${this.PUBLIC_KEY}` +
      `&sid=abcd1234` +
      `&flow=xtls-rprx-vision#${encodeURIComponent(label)}`
    );
  }

  async syncActiveClientsToServer() {
    const now = new Date();

    const users = await this.prisma.user.findMany({
      where: {
        vpnUuid: { not: null },
        subscriptions: {
          some: {
            status: 'active',
            expiresAt: { gt: now },
          },
        },
      },
      select: {
        vpnUuid: true,
      },
    });

    const clients = users
      .filter((u) => !!u.vpnUuid)
      .map((u) => ({
        id: u.vpnUuid as string,
        flow: 'xtls-rprx-vision',
      }));

    await this.sshService.syncXrayClients(clients);
    return clients.length;
  }

  async markExpiredSubscriptions() {
    return this.prisma.subscription.updateMany({
      where: {
        status: 'active',
        expiresAt: { lte: new Date() },
      },
      data: {
        status: 'expired',
      },
    });
  }

  async getOrCreateUserVpn(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let vpnUuid = user.vpnUuid;

    if (!vpnUuid) {
      vpnUuid = uuidv4();

      await this.prisma.user.update({
        where: { id: userId },
        data: { vpnUuid },
      });
    }

    await this.syncActiveClientsToServer();

    return {
      uuid: vpnUuid,
      link: this.buildLink(vpnUuid, `VPN-${user.username ?? user.id}`),
    };
  }

  async getSubscriptionUrl(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let vpnUuid = user.vpnUuid;

    if (!vpnUuid) {
      vpnUuid = uuidv4();

      await this.prisma.user.update({
        where: { id: userId },
        data: { vpnUuid },
      });
    }

    await this.syncActiveClientsToServer();

    return this.buildLink(vpnUuid, `VPN-${user.username ?? user.id}`) + '\n';
  }
}