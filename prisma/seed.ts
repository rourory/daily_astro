import { PrismaClient, PlanName, Currency, ZodiacSign } from "@prisma/client";

const prisma = new PrismaClient();

// Маппинг валют, локалей и множителей цен
// Базовая цена (basePrice) будет умножаться на ratio для получения красивых цен в других валютах
const REGIONS = [
  { currency: Currency.BYN, locale: "by", ratio: 100 }, // 1 BYN = 100 копеек (Исходная: 3.00)
  { currency: Currency.USD, locale: "en", ratio: 33 }, // ~$1.00 (за 3 BYN) -> 100 центов
  { currency: Currency.RUB, locale: "ru", ratio: 3000 }, // ~90 RUB (за 3 BYN) -> 9000 копеек
  { currency: Currency.CNY, locale: "zh", ratio: 230 }, // ~7 CNY (за 3 BYN) -> 700 фэней
  { currency: Currency.KZT, locale: "kk", ratio: 15000 }, // ~450 KZT (за 3 BYN) -> 45000 тиын
];

// Конфигурация планов с базовой ценой в BYN (целых единицах)
const PLANS_CONFIG = [
  {
    name: PlanName.basic,
    basePriceByn: 3, // 3 BYN
  },
  {
    name: PlanName.plus,
    basePriceByn: 6, // 6 BYN
  },
  {
    name: PlanName.premium,
    basePriceByn: 12, // 12 BYN
  },
];

// Старые данные шаблонов (адаптируем их под новую схему ниже)
const rawTemplates = [
  {
    triggerType: "moon_in_sign",
    triggerValue: "aries",
    category: "love",
    textRu: "Луна в Овне зажигает страсть — действуйте решительно.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "aries",
    category: "money",
    textRu: "Импульсивные покупки сегодня лучше отложить.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "aries",
    category: "mood",
    textRu: "Энергия бьёт через край — направьте её в дело.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "aries",
    category: "advice",
    textRu: "Начните то, что давно откладывали.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "leo",
    category: "love",
    textRu: "Луна во Льве просит внимания — покажите чувства.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "leo",
    category: "money",
    textRu: "Хороший день для презентаций и переговоров.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "leo",
    category: "mood",
    textRu: "Творческий подъём — используйте его.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "leo",
    category: "advice",
    textRu: "Побалуйте себя чем-то приятным.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "taurus",
    category: "love",
    textRu: "Луна в Тельце ценит стабильность — укрепляйте связи.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "taurus",
    category: "money",
    textRu: "Практичные решения принесут результат.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "taurus",
    category: "mood",
    textRu: "Спокойствие — ваша сила сегодня.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "taurus",
    category: "advice",
    textRu: "Позаботьтесь о комфорте — это не лишнее.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "gemini",
    category: "love",
    textRu: "Разговоры сегодня важнее жестов.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "gemini",
    category: "money",
    textRu: "Информация — ваш главный актив.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "gemini",
    category: "mood",
    textRu: "Любопытство ведёт к открытиям.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "gemini",
    category: "advice",
    textRu: "Напишите тому, о ком давно думали.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "cancer",
    category: "love",
    textRu: "Забота о близких возвращается сторицей.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "cancer",
    category: "money",
    textRu: "Интуиция подскажет верное решение.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "cancer",
    category: "mood",
    textRu: "Дом — лучшее место сегодня.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "cancer",
    category: "advice",
    textRu: "Позвоните родным — они ждут.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "virgo",
    category: "love",
    textRu: "Внимание к деталям укрепит доверие.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "virgo",
    category: "money",
    textRu: "Проверьте документы и расчёты.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "virgo",
    category: "mood",
    textRu: "Порядок в делах — порядок в голове.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "virgo",
    category: "advice",
    textRu: "Составьте список дел — это поможет.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "libra",
    category: "love",
    textRu: "Гармония в отношениях требует компромисса.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "libra",
    category: "money",
    textRu: "Партнёрство может быть выгодным.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "libra",
    category: "mood",
    textRu: "Красота вокруг поднимает настроение.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "libra",
    category: "advice",
    textRu: "Найдите баланс между «надо» и «хочу».",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "scorpio",
    category: "love",
    textRu: "Глубина чувств требует доверия.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "scorpio",
    category: "money",
    textRu: "Скрытые ресурсы могут проявиться.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "scorpio",
    category: "mood",
    textRu: "Интенсивность эмоций — это нормально.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "scorpio",
    category: "advice",
    textRu: "Отпустите то, что уже не нужно.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "sagittarius",
    category: "love",
    textRu: "Открытость привлекает — будьте искренни.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "sagittarius",
    category: "money",
    textRu: "Перспективы расширяются — смотрите дальше.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "sagittarius",
    category: "mood",
    textRu: "Оптимизм заразителен — делитесь им.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "sagittarius",
    category: "advice",
    textRu: "Запланируйте что-то новое на ближайшее время.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "capricorn",
    category: "love",
    textRu: "Серьёзный разговор сблизит вас.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "capricorn",
    category: "money",
    textRu: "Стратегическое мышление сегодня в приоритете.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "capricorn",
    category: "mood",
    textRu: "Дисциплина приносит удовлетворение.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "capricorn",
    category: "advice",
    textRu: "Поставьте конкретную цель на неделю.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "aquarius",
    category: "love",
    textRu: "Оригинальность привлекает внимание.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "aquarius",
    category: "money",
    textRu: "Нестандартные идеи могут сработать.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "aquarius",
    category: "mood",
    textRu: "Свобода мысли — ключ к хорошему дню.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "aquarius",
    category: "advice",
    textRu: "Попробуйте что-то совершенно новое.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "pisces",
    category: "love",
    textRu: "Романтика в воздухе — ловите момент.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "pisces",
    category: "money",
    textRu: "Творческий подход к финансам поможет.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "pisces",
    category: "mood",
    textRu: "Мечтательность сегодня уместна.",
  },
  {
    triggerType: "moon_in_sign",
    triggerValue: "pisces",
    category: "advice",
    textRu: "Найдите время для себя и тишины.",
  },
  {
    triggerType: "moon_phase",
    triggerValue: "new_moon",
    category: "love",
    textRu: "Новолуние — время для новых начинаний в отношениях.",
  },
  {
    triggerType: "moon_phase",
    triggerValue: "new_moon",
    category: "money",
    textRu: "Посадите семена будущих проектов.",
  },
  {
    triggerType: "moon_phase",
    triggerValue: "new_moon",
    category: "advice",
    textRu: "Поставьте намерение на лунный цикл.",
  },
  {
    triggerType: "moon_phase",
    triggerValue: "full_moon",
    category: "love",
    textRu: "Полнолуние усиливает эмоции — будьте мягче.",
  },
  {
    triggerType: "moon_phase",
    triggerValue: "full_moon",
    category: "mood",
    textRu: "Эмоции на пике — это временно.",
  },
  {
    triggerType: "moon_phase",
    triggerValue: "full_moon",
    category: "advice",
    textRu: "Завершите то, что начали две недели назад.",
  },
  {
    triggerType: "day_of_week",
    triggerValue: "monday",
    category: "advice",
    textRu: "Начните неделю с главного.",
  },
  {
    triggerType: "day_of_week",
    triggerValue: "friday",
    category: "mood",
    textRu: "Конец недели — отпустите напряжение.",
  },
  {
    triggerType: "day_of_week",
    triggerValue: "sunday",
    category: "advice",
    textRu: "Восстановите силы перед новой неделей.",
  },
];

async function main() {
  console.log("🌱 Starting seed...");

  // ---------------- SEED PLANS & PRICES ----------------
  console.log("💳 Seeding Plans and Prices...");

  for (const planConfig of PLANS_CONFIG) {
    // 1. Создаем или обновляем План
    const plan = await prisma.plan.upsert({
      where: { name: planConfig.name },
      update: {},
      create: {
        name: planConfig.name,
      },
    });

    console.log(`   Processed Plan: ${plan.name}`);

    // 2. Для каждого плана создаем цены в 5 валютах
    for (const region of REGIONS) {
      // Расчет цены: Базовая (3) * Ratio (100) = 300 копеек (BYN)
      // Пример USD: Базовая (3) * Ratio (33) = 99 центов ($0.99)
      const amount = Math.round(planConfig.basePriceByn * region.ratio);

      await prisma.planPrice.upsert({
        where: {
          planId_currency: {
            planId: plan.id,
            currency: region.currency,
          },
        },
        update: {
          amount: amount,
          locale: region.locale,
          isActive: true,
        },
        create: {
          planId: plan.id,
          currency: region.currency,
          amount: amount,
          locale: region.locale,
          isActive: true,
        },
      });
    }
  }
  console.log("✅ Plans and Prices seeded successfully");

  // ---------------- SEED CONTENT TEMPLATES ----------------
  console.log("📝 Seeding Content Templates...");

  const existingTemplatesCount = await prisma.contentTemplate.count();

  if (existingTemplatesCount === 0) {
    let count = 0;
    for (const t of rawTemplates) {
      // Поскольку мы изменили структуру, нам нужно создавать Template
      // и сразу же связанный Translation
      await prisma.contentTemplate.create({
        data: {
          triggerType: t.triggerType,
          triggerValue: t.triggerValue,
          category: t.category,
          // Сразу создаем перевод для RU
          translations: {
            create: {
              locale: "ru",
              text: t.textRu,
            },
          },
        },
      });
      count++;
    }
    console.log(`✅ Seeded ${count} content templates with translations`);
  } else {
    console.log("⏩ Content templates already exist, skipping...");
  }

  console.log("🚀 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
