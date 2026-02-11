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
} as const

export type ZodiacSign = (typeof ZodiacSign)[keyof typeof ZodiacSign]

export const PlanName = {
  basic: "basic",
  plus: "plus",
  premium: "premium",
} as const

export type PlanName = (typeof PlanName)[keyof typeof PlanName]

export const SubscriptionStatus = {
  trial: "trial",
  active: "active",
  canceled: "canceled",
  expired: "expired",
  grace: "grace",
} as const

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export const PaymentStatus = {
  pending: "pending",
  succeeded: "succeeded",
  failed: "failed",
  refunded: "refunded",
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

// Zodiac sign utilities
export const ZODIAC_SIGN_VALUES = Object.values(ZodiacSign)

export const ZODIAC_NAMES: Record<ZodiacSign, string> = {
  aries: "Овен",
  taurus: "Телец",
  gemini: "Близнецы",
  cancer: "Рак",
  leo: "Лев",
  virgo: "Дева",
  libra: "Весы",
  scorpio: "Скорпион",
  sagittarius: "Стрелец",
  capricorn: "Козерог",
  aquarius: "Водолей",
  pisces: "Рыбы",
}

export const ZODIAC_SYMBOLS: Record<ZodiacSign, string> = {
  aries: "♈",
  taurus: "♉",
  gemini: "♊",
  cancer: "♋",
  leo: "♌",
  virgo: "♍",
  libra: "♎",
  scorpio: "♏",
  sagittarius: "♐",
  capricorn: "♑",
  aquarius: "♒",
  pisces: "♓",
}

export const ZODIAC_SIGNS_LIST = [
  { id: ZodiacSign.aries, name: "Овен", symbol: "♈", dates: "21.03 - 19.04" },
  { id: ZodiacSign.taurus, name: "Телец", symbol: "♉", dates: "20.04 - 20.05" },
  { id: ZodiacSign.gemini, name: "Близнецы", symbol: "♊", dates: "21.05 - 20.06" },
  { id: ZodiacSign.cancer, name: "Рак", symbol: "♋", dates: "21.06 - 22.07" },
  { id: ZodiacSign.leo, name: "Лев", symbol: "♌", dates: "23.07 - 22.08" },
  { id: ZodiacSign.virgo, name: "Дева", symbol: "♍", dates: "23.08 - 22.09" },
  { id: ZodiacSign.libra, name: "Весы", symbol: "♎", dates: "23.09 - 22.10" },
  { id: ZodiacSign.scorpio, name: "Скорпион", symbol: "♏", dates: "23.10 - 21.11" },
  { id: ZodiacSign.sagittarius, name: "Стрелец", symbol: "♐", dates: "22.11 - 21.12" },
  { id: ZodiacSign.capricorn, name: "Козерог", symbol: "♑", dates: "22.12 - 19.01" },
  { id: ZodiacSign.aquarius, name: "Водолей", symbol: "♒", dates: "20.01 - 18.02" },
  { id: ZodiacSign.pisces, name: "Рыбы", symbol: "♓", dates: "19.02 - 20.03" },
] as const
