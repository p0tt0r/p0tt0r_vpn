import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll() {
    return this.prisma.subscription.findMany({
      include: {
        user: true,
        plan: true,
      },
    });
  }

  async create(userId: string, planId: string) {
  const plan = await this.prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) throw new Error('Plan not found');

  // 🔥 1. Убиваем старые активные подписки
  await this.prisma.subscription.updateMany({
    where: {
      userId,
      status: 'active',
    },
    data: {
      status: 'expired',
    },
  });

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
  );

  // 🔥 2. Создаём новую
  return this.prisma.subscription.create({
    data: {
      userId,
      planId,
      status: 'active',
      startsAt: now,
      expiresAt,
    },
  });
}
}