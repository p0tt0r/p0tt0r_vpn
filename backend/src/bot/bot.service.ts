import { Injectable, OnModuleInit } from '@nestjs/common';
import { Markup, Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { VpnService } from '../vpn/vpn.service';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly vpnService: VpnService,
  ) {
    const token = process.env.BOT_TOKEN;

    if (!token) {
      throw new Error('BOT_TOKEN is not set in .env');
    }

    this.bot = new Telegraf(token);

    this.bot.catch((err) => {
      console.error('Bot error:', err);
    });
  }

  async onModuleInit() {
    this.registerHandlers();
    void this.startBot();
  }

  private async startBot() {
    try {
      await this.bot.launch();
      console.log('🤖 Telegram bot started');
    } catch (error) {
      console.error('❌ Telegram bot failed to start');
      console.error(error);
    }
  }

  private registerHandlers() {
    this.bot.start(async (ctx) => {
      try {
        const telegramId = String(ctx.from?.id ?? '');
        const username = ctx.from?.username ?? ctx.from?.first_name ?? 'user';

        let user = await this.usersService.findByTelegramId(telegramId);

        if (!user) {
          user = await this.usersService.create({
            telegramId,
            username,
          });
        }

        await ctx.reply(
          `Привет 👋\nЭто бот твоего VPN сервиса.\n\nВыбери действие:`,
          Markup.keyboard([['📋 Тарифы', '👤 Моя подписка']]).resize(),
        );
      } catch (error) {
        console.error('Start error:', error);
        await ctx.reply('Ошибка при запуске бота.');
      }
    });

    this.bot.hears('📋 Тарифы', async (ctx) => {
      try {
        const plans = await this.prisma.plan.findMany({
          orderBy: { createdAt: 'asc' },
        });

        if (!plans.length) {
          await ctx.reply('Тарифов пока нет.');
          return;
        }

        for (const plan of plans) {
          await ctx.reply(
            `💳 ${plan.name}\n⏳ ${plan.durationDays} дней\n📦 ${plan.trafficLimitGb} GB\n💰 ${plan.priceRub} ₽`,
            Markup.inlineKeyboard([
              Markup.button.callback(`Купить ${plan.name}`, `buy_${plan.id}`),
            ]),
          );
        }
      } catch (error) {
        console.error('Tariffs error:', error);
        await ctx.reply('Ошибка при получении тарифов.');
      }
    });

    this.bot.action(/buy_(.+)/, async (ctx) => {
  try {
    const planId = ctx.match[1];
    const telegramId = String(ctx.from?.id ?? '');
    const username = ctx.from?.username ?? ctx.from?.first_name ?? 'user';

    let user = await this.usersService.findByTelegramId(telegramId);

    if (!user) {
      user = await this.usersService.create({
        telegramId,
        username,
      });
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      await ctx.reply('Тариф не найден.');
      return;
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
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

    if (activeSubscription) {
      await ctx.reply(
        `У тебя уже есть активная подписка ${activeSubscription.plan.name}\n` +
          `Действует до: ${new Date(activeSubscription.expiresAt).toLocaleString('ru-RU')}\n\n` +
          `Хочешь продлить её ещё на ${plan.durationDays} дней?`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              `✅ Продлить ${plan.name}`,
              `extend_${plan.id}`,
            ),
          ],
          [Markup.button.callback('❌ Отмена', 'extend_cancel')],
        ]),
      );
      return;
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startsAt: now,
        expiresAt,
      },
    });

    await ctx.reply(
      `🎉 Подписка оформлена!\n\n` +
        `Тариф: ${plan.name}\n` +
        `До: ${expiresAt.toLocaleString('ru-RU')}`,
    );
  } catch (error) {
    console.error('Buy error:', error);
    await ctx.reply('Ошибка при оформлении подписки.');
  }
});

this.bot.action(/extend_(.+)/, async (ctx) => {
  try {
    const planId = ctx.match[1];
    const telegramId = String(ctx.from?.id ?? '');

    const user = await this.usersService.findByTelegramId(telegramId);

    if (!user) {
      await ctx.reply('Пользователь не найден.');
      return;
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      await ctx.reply('Тариф не найден.');
      return;
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
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

    if (!activeSubscription) {
      await ctx.reply('Активная подписка не найдена.');
      return;
    }

    const currentExpiry = new Date(activeSubscription.expiresAt);
    const newExpiresAt = new Date(
      currentExpiry.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.subscription.update({
      where: {
        id: activeSubscription.id,
      },
      data: {
        expiresAt: newExpiresAt,
      },
    });

    await ctx.reply(
      `✅ Подписка продлена!\n\n` +
        `Тариф: ${activeSubscription.plan.name}\n` +
        `Теперь действует до: ${newExpiresAt.toLocaleString('ru-RU')}`,
    );
  } catch (error) {
    console.error('Extend error:', error);
    await ctx.reply('Ошибка при продлении подписки.');
  }
});
this.bot.action('extend_cancel', async (ctx) => {
  await ctx.reply('Продление отменено.');
});
    this.bot.hears('👤 Моя подписка', async (ctx) => {
      try {
        const telegramId = String(ctx.from?.id ?? '');

        const user = await this.usersService.findByTelegramId(telegramId);

        if (!user) {
          await ctx.reply('Пользователь не найден. Нажми /start');
          return;
        }

        const subscription = await this.usersService.getSubscription(user.id);

        if (!subscription) {
          await ctx.reply('❌ У тебя нет активной подписки');
          return;
        }

        const vpn = await this.vpnService.getOrCreateUserVpn(user.id);

        await ctx.reply(
          `✅ Активная подписка\n\n` +
            `📦 Тариф: ${subscription.plan.name}\n` +
            `📅 До: ${new Date(subscription.expiresAt).toLocaleString('ru-RU')}`,
        );

        await ctx.reply(
          `<code>${vpn.link}</code>`,
          {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
          },
        );

        await ctx.reply('📋 Зажми сообщение со ссылкой и выбери "Скопировать".');
      } catch (error) {
        console.error('Subscription error:', error);
        await ctx.reply('Ошибка при получении подписки.');
      }
    });
  }
}