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
}