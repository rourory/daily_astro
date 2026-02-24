import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { PaymentStatus } from "../types/database";
import { SubscriptionStatus, ZodiacSign } from "../types/enums";

// ---------------- USER SERVICE ----------------
export const UserService = {
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { subscriptions: true, partners: true },
    });
  },

  async findByTelegramId(telegramId: bigint) {
    return prisma.user.findUnique({
      where: { telegramId },
    });
  },

  async findMany(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    return prisma.user.findMany(params);
  },

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
  async findManyWithPagination({
    page = 1,
    limit = 20,
    search,
    zodiacSign,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    zodiacSign?: ZodiacSign;
  }) {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      AND: [
        // Фильтр по знаку
        zodiacSign ? { zodiacSign } : {},
        // Поиск
        search
          ? {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                // Если поиск состоит только из цифр, ищем по TelegramID
                ...(isValidBigInt(search)
                  ? [{ telegramId: BigInt(search) }]
                  : []),
              ],
            }
          : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          // Берем актуальную подписку, чтобы показать статус
          subscriptions: {
            where: {
              status: {
                in: [
                  SubscriptionStatus.active,
                  SubscriptionStatus.trial,
                  SubscriptionStatus.grace,
                  // SubscriptionStatus.paused,
                ],
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      metadata: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  },
};

// ---------------- PLAN SERVICE ----------------
export const PlanService = {
  async create(data: Prisma.PlanCreateInput) {
    return prisma.plan.create({ data });
  },

  async findById(id: string) {
    return prisma.plan.findUnique({
      where: { id },
      include: { prices: true },
    });
  },

  async findAll() {
    return prisma.plan.findMany({
      include: { prices: true },
    });
  },

  async update(id: string, data: Prisma.PlanUpdateInput) {
    return prisma.plan.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.plan.delete({
      where: { id },
    });
  },
};

// ---------------- PLAN PRICE SERVICE ----------------
export const PlanPriceService = {
  async create(data: Prisma.PlanPriceCreateInput) {
    return prisma.planPrice.create({ data });
  },

  async findById(id: string) {
    return prisma.planPrice.findUnique({ where: { id } });
  },

  async findByPlanAndCurrency(
    planId: string,
    currency: import("@prisma/client").Currency,
  ) {
    return prisma.planPrice.findUnique({
      where: {
        planId_currency: { planId, currency },
      },
    });
  },

  async update(id: string, data: Prisma.PlanPriceUpdateInput) {
    return prisma.planPrice.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.planPrice.delete({ where: { id } });
  },
};

// ---------------- SUBSCRIPTION SERVICE ----------------
export const SubscriptionService = {
  async create(data: Prisma.SubscriptionCreateInput) {
    return prisma.subscription.create({ data });
  },

  async findById(id: string) {
    return prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, user: true },
    });
  },

  async findByUser(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id: string, data: Prisma.SubscriptionUpdateInput) {
    return prisma.subscription.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.subscription.delete({ where: { id } });
  },

  async findManyWithPagination({
    page = 1,
    limit = 20,
    search,
    status,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    status?: SubscriptionStatus;
  }) {
    const skip = (page - 1) * limit;

    // Условия поиска
    const where: Prisma.SubscriptionWhereInput = {
      AND: [
        // Фильтр по статусу
        status ? { status } : {},
        // Поиск по Email или Telegram ID
        search
          ? {
              user: {
                OR: [
                  { email: { contains: search, mode: "insensitive" } },
                  // Проверяем, является ли search числом, перед поиском по BigInt
                  ...(isValidBigInt(search)
                    ? [{ telegramId: BigInt(search) }]
                    : []),
                ],
              },
            }
          : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" }, // Или renewAt, если важнее дата продления
        take: limit,
        skip,
        include: {
          user: true,
          plan: true,
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return {
      data,
      metadata: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  },
};

// ---------------- PAYMENT SERVICE ----------------
export const PaymentService = {
  async create(data: Prisma.PaymentCreateInput) {
    return prisma.payment.create({ data });
  },

  async findById(id: string) {
    return prisma.payment.findUnique({ where: { id } });
  },

  async findByOrderId(orderId: string) {
    return prisma.payment.findUnique({ where: { orderId } });
  },

  async update(id: string, data: Prisma.PaymentUpdateInput) {
    return prisma.payment.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.payment.delete({ where: { id } });
  },

  async findManyWithPagination({
    page = 1,
    limit = 20,
    search,
    status,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    status?: PaymentStatus;
  }) {
    const skip = (page - 1) * limit;

    // Формируем условия поиска
    const where: Prisma.PaymentWhereInput = {
      AND: [
        // Фильтр по статусу, если выбран
        status ? { status } : {},
        // Поиск (Order ID, Email, или Telegram ID)
        search
          ? {
              OR: [
                { orderId: { contains: search, mode: "insensitive" } },
                { user: { email: { contains: search, mode: "insensitive" } } },
                // Для BigInt (TelegramId) нужен точный поиск, и только если search — число
                ...(isValidBigInt(search)
                  ? [{ user: { telegramId: BigInt(search) } }]
                  : []),
              ],
            }
          : {},
      ],
    };

    // Запрашиваем данные и общее количество параллельно
    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          user: true,
          subscription: { include: { plan: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data,
      metadata: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  },
};

// ---------------- ASTRO EVENT SERVICE ----------------
export const AstroEventService = {
  async create(data: Prisma.AstroEventCreateInput) {
    return prisma.astroEvent.create({ data });
  },

  async findById(id: string) {
    return prisma.astroEvent.findUnique({ where: { id } });
  },

  async findByDate(date: Date) {
    return prisma.astroEvent.findMany({
      where: { eventDate: date },
    });
  },

  async update(id: string, data: Prisma.AstroEventUpdateInput) {
    return prisma.astroEvent.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.astroEvent.delete({ where: { id } });
  },
};

// ---------------- FORECAST SERVICE ----------------
export const ForecastService = {
  // Можно передать вложенные переводы сразу в create
  async create(data: Prisma.ForecastCreateInput) {
    return prisma.forecast.create({ data });
  },

  async findById(id: string) {
    return prisma.forecast.findUnique({
      where: { id },
      include: { translations: true },
    });
  },

  async findByDateAndSign(
    date: Date,
    zodiacSign: import("@prisma/client").ZodiacSign,
  ) {
    return prisma.forecast.findUnique({
      where: {
        forecastDate_zodiacSign: {
          forecastDate: date,
          zodiacSign: zodiacSign,
        },
      },
      include: { translations: true },
    });
  },

  async update(id: string, data: Prisma.ForecastUpdateInput) {
    return prisma.forecast.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.forecast.delete({ where: { id } });
  },
};

// ---------------- FORECAST TRANSLATION SERVICE ----------------
export const ForecastTranslationService = {
  async create(data: Prisma.ForecastTranslationCreateInput) {
    return prisma.forecastTranslation.create({ data });
  },

  async findById(id: string) {
    return prisma.forecastTranslation.findUnique({ where: { id } });
  },

  async update(id: string, data: Prisma.ForecastTranslationUpdateInput) {
    return prisma.forecastTranslation.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.forecastTranslation.delete({ where: { id } });
  },
};

// ---------------- CONTENT TEMPLATE SERVICE ----------------
export const ContentTemplateService = {
  async create(data: Prisma.ContentTemplateCreateInput) {
    return prisma.contentTemplate.create({ data });
  },

  async findById(id: string) {
    return prisma.contentTemplate.findUnique({
      where: { id },
      include: { translations: true },
    });
  },

  async findByTrigger(triggerType: string, triggerValue: string) {
    return prisma.contentTemplate.findMany({
      where: { triggerType, triggerValue },
      include: { translations: true },
    });
  },

  async update(id: string, data: Prisma.ContentTemplateUpdateInput) {
    return prisma.contentTemplate.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.contentTemplate.delete({ where: { id } });
  },
};

// ---------------- CONTENT TEMPLATE TRANSLATION SERVICE ----------------
export const ContentTemplateTranslationService = {
  async create(data: Prisma.ContentTemplateTranslationCreateInput) {
    return prisma.contentTemplateTranslation.create({ data });
  },

  async findById(id: string) {
    return prisma.contentTemplateTranslation.findUnique({ where: { id } });
  },

  async update(id: string, data: Prisma.ContentTemplateTranslationUpdateInput) {
    return prisma.contentTemplateTranslation.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.contentTemplateTranslation.delete({ where: { id } });
  },
};

// ---------------- DELIVERY SERVICE ----------------
export const DeliveryService = {
  async create(data: Prisma.DeliveryCreateInput) {
    return prisma.delivery.create({ data });
  },

  async findById(id: string) {
    return prisma.delivery.findUnique({ where: { id } });
  },

  async findByUserAndDate(userId: string, date: Date) {
    return prisma.delivery.findMany({
      where: {
        userId,
        deliveryDate: date,
      },
    });
  },

  async update(id: string, data: Prisma.DeliveryUpdateInput) {
    return prisma.delivery.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.delivery.delete({ where: { id } });
  },
};

// ---------------- USER PARTNER SERVICE ----------------
export const UserPartnerService = {
  async create(data: Prisma.UserPartnerCreateInput) {
    return prisma.userPartner.create({ data });
  },

  async findById(id: string) {
    return prisma.userPartner.findUnique({ where: { id } });
  },

  async findByUser(userId: string) {
    return prisma.userPartner.findMany({ where: { userId } });
  },

  async update(id: string, data: Prisma.UserPartnerUpdateInput) {
    return prisma.userPartner.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.userPartner.delete({ where: { id } });
  },
};

// ---------------- GIFT SUBSCRIPTION SERVICE ----------------
export const GiftSubscriptionService = {
  async create(data: Prisma.GiftSubscriptionCreateInput) {
    return prisma.giftSubscription.create({ data });
  },

  async findById(id: string) {
    return prisma.giftSubscription.findUnique({ where: { id } });
  },

  async findByCode(code: string) {
    return prisma.giftSubscription.findUnique({ where: { code } });
  },

  async update(id: string, data: Prisma.GiftSubscriptionUpdateInput) {
    return prisma.giftSubscription.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.giftSubscription.delete({ where: { id } });
  },
};

// ---------------- SYSTEM LOG SERVICE ----------------
export const SystemLogService = {
  async create(data: Prisma.SystemLogCreateInput) {
    return prisma.systemLog.create({ data });
  },

  async findById(id: string) {
    return prisma.systemLog.findUnique({ where: { id } });
  },

  async findMany(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.SystemLogWhereInput;
    orderBy?: Prisma.SystemLogOrderByWithRelationInput;
  }) {
    return prisma.systemLog.findMany(params);
  },

  // Обновление и удаление логов обычно не требуется, но для CRUD добавим
  async update(id: string, data: Prisma.SystemLogUpdateInput) {
    return prisma.systemLog.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.systemLog.delete({ where: { id } });
  },
};

function isValidBigInt(value: string) {
  return /^\d+$/.test(value);
}
