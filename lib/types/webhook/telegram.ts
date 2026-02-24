import {
  SubscriptionStatus,
  Prisma,
} from "@prisma/client";

export const userInclude = {
  subscriptions: {
    where: {
      status: { in: [SubscriptionStatus.active, SubscriptionStatus.trial] },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.UserInclude;

export type UserWithPlan = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

export type Translations = {
  Common: {
    zodiac_signs_array: Array<{ id: string; name: string }>;
  };
  Bot: Record<string, string>;
};
