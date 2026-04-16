import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VpnService } from '../vpn/vpn.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vpnService: VpnService,
  ) {}

  async getAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { telegramId?: string; username?: string }) {
    return this.prisma.user.create({
      data,
    });
  }

  async findByTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({
      where: { telegramId },
    });
  }

  async getActiveSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getSubscription(userId: string) {
    return this.getActiveSubscription(userId);
  }

  async getAccess(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return {
        hasAccess: false,
        plan: null,
        expiresAt: null,
        trafficLimitGb: null,
      };
    }

    return {
      hasAccess: true,
      plan: subscription.plan.name,
      expiresAt: subscription.expiresAt,
      trafficLimitGb: subscription.plan.trafficLimitGb,
    };
  }

  async getSubscriptionUrl(userId: string) {
    return this.vpnService.getSubscriptionUrl(userId);
  }

  async getUserVpnStatus(userId: string) {
    return this.vpnService.getUserVpnStatus(userId);
  }

  async getClientConfig(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        hasAccess: false,
        message: 'User not found',
        config: null,
      };
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return {
        hasAccess: false,
        message: 'No active subscription',
        config: null,
      };
    }

    if (!user.vpnUuid) {
      return {
        hasAccess: false,
        message: 'VPN UUID not found',
        config: null,
      };
    }

    const vpnHost = process.env.VPN_HOST!;
    const vpnPort = Number(process.env.VPN_PORT!);
    const publicKey = process.env.VPN_PUBLIC_KEY!;
    const shortId = process.env.VPN_SHORT_ID!;

    // 🔥 ОБНОВЛЕННЫЕ RULES
    const routeRules = [
      {
        geosite: ['tiktok'],
        outbound: 'proxy',
      },
      {
        ip_cidr: [
          '127.0.0.0/8',
          '10.0.0.0/8',
          '172.16.0.0/12',
          '192.168.0.0/16',
        ],
        outbound: 'direct',
      },
      {
        geoip: ['private', 'ru'],
        outbound: 'direct',
      },
      {
        geosite: ['ru'],
        outbound: 'direct',
      },
    ];

    const config = {
      log: {
        level: 'info',
      },
      dns: {
        servers: [
          {
            tag: 'dns-remote',
            address: 'https://1.1.1.1/dns-query',
            detour: 'proxy',
          },
          {
            tag: 'dns-direct',
            address: '8.8.8.8', // 🔥 изменили
            detour: 'direct',
          },
        ],
        final: 'dns-remote',
      },
      inbounds: [
        {
          type: 'mixed',
          tag: 'mixed-in',
          listen: '127.0.0.1',
          listen_port: 2080,
        },
      ],
      outbounds: [
        {
          type: 'vless',
          tag: 'proxy',
          server: vpnHost,
          server_port: vpnPort,
          uuid: user.vpnUuid,
          flow: 'xtls-rprx-vision',
          tls: {
            enabled: true,
            server_name: 'api.tiktok.com', // 🔥 изменили
            reality: {
              enabled: true,
              public_key: publicKey,
              short_id: shortId,
            },
          },
          transport: {
            type: 'tcp',
          },
          tcp: {
            no_delay: true, // 🔥 добавили
          },
        },
        {
          type: 'direct',
          tag: 'direct',
        },
        {
          type: 'block',
          tag: 'block',
        },
      ],
      route: {
        auto_detect_interface: true,
        rules: routeRules,
        final: 'proxy',
      },
    };

    return {
      hasAccess: true,
      message: 'Client config generated',
      config,
    };
  }
}