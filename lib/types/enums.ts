// Enums matching Prisma schema - used for type safety without @prisma/client generation

export const ZodiacSign = {
  aries: "aries",
  taurus: "taurus",
  gemini: "gemini",
  cancer: "cancer",
  leo: "leo",
  virgo: "virgo",
  libra: "libra",
  scorpio: "scorpio",
  sagittarius: "sagittarius",
  capricorn: "capricorn",
  aquarius: "aquarius",
  pisces: "pisces",
} as const;

export type ZodiacSign = (typeof ZodiacSign)[keyof typeof ZodiacSign];

export const PlanName = {
  basic: "basic",
  plus: "plus",
  premium: "premium",
} as const;

export type PlanName = (typeof PlanName)[keyof typeof PlanName];

export const SubscriptionStatus = {
  trial: "trial",
  active: "active",
  canceled: "canceled",
  expired: "expired",
  grace: "grace",
  pending: "pending",
} as const;

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PaymentStatus = {
  pending: "pending",
  succeeded: "succeeded",
  failed: "failed",
  refunded: "refunded",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// Zodiac sign utilities
export const ZODIAC_SIGN_VALUES = Object.values(ZodiacSign);

export const ZODIAC_SIGNS = [
  { id: "aries", symbol: "♈", dates: "21.03 - 19.04" },
  { id: "taurus", symbol: "♉", dates: "20.04 - 20.05" },
  { id: "gemini", symbol: "♊", dates: "21.05 - 20.06" },
  { id: "cancer", symbol: "♋", dates: "21.06 - 22.07" },
  { id: "leo", symbol: "♌", dates: "23.07 - 22.08" },
  { id: "virgo", symbol: "♍", dates: "23.08 - 22.09" },
  { id: "libra", symbol: "♎", dates: "23.09 - 22.10" },
  { id: "scorpio", symbol: "♏", dates: "23.10 - 21.11" },
  { id: "sagittarius", symbol: "♐", dates: "22.11 - 21.12" },
  { id: "capricorn", symbol: "♑", dates: "22.12 - 19.01" },
  { id: "aquarius", symbol: "♒", dates: "20.01 - 18.02" },
  { id: "pisces", symbol: "♓", dates: "19.02 - 20.03" },
];
