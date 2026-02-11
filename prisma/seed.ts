import { PrismaClient } from "@prisma/client"
import { PlanName } from "@/lib/types/enums"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Seed plans
  const plans = [
    {
      name: PlanName.basic,
      priceBynMonth: 300,
      features: { daily_forecast: true, love: true, money: true, mood: true, advice: true },
    },
    {
      name: PlanName.plus,
      priceBynMonth: 600,
      features: {
        daily_forecast: true,
        love: true,
        money: true,
        mood: true,
        advice: true,
        compatibility: true,
        affirmations: true,
      },
    },
    {
      name: PlanName.premium,
      priceBynMonth: 1200,
      features: {
        daily_forecast: true,
        love: true,
        money: true,
        mood: true,
        advice: true,
        compatibility: true,
        affirmations: true,
        important_dates: true,
        flexible_time: true,
        no_ads: true,
      },
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: { priceBynMonth: plan.priceBynMonth, features: plan.features },
      create: plan,
    })
  }
  console.log("Plans seeded")

  // Seed content templates
  const templates = [
    { triggerType: "moon_in_sign", triggerValue: "aries", category: "love", textRu: "Луна в Овне зажигает страсть — действуйте решительно." },
    { triggerType: "moon_in_sign", triggerValue: "aries", category: "money", textRu: "Импульсивные покупки сегодня лучше отложить." },
    { triggerType: "moon_in_sign", triggerValue: "aries", category: "mood", textRu: "Энергия бьёт через край — направьте её в дело." },
    { triggerType: "moon_in_sign", triggerValue: "aries", category: "advice", textRu: "Начните то, что давно откладывали." },
    { triggerType: "moon_in_sign", triggerValue: "leo", category: "love", textRu: "Луна во Льве просит внимания — покажите чувства." },
    { triggerType: "moon_in_sign", triggerValue: "leo", category: "money", textRu: "Хороший день для презентаций и переговоров." },
    { triggerType: "moon_in_sign", triggerValue: "leo", category: "mood", textRu: "Творческий подъём — используйте его." },
    { triggerType: "moon_in_sign", triggerValue: "leo", category: "advice", textRu: "Побалуйте себя чем-то приятным." },
    { triggerType: "moon_in_sign", triggerValue: "taurus", category: "love", textRu: "Луна в Тельце ценит стабильность — укрепляйте связи." },
    { triggerType: "moon_in_sign", triggerValue: "taurus", category: "money", textRu: "Практичные решения принесут результат." },
    { triggerType: "moon_in_sign", triggerValue: "taurus", category: "mood", textRu: "Спокойствие — ваша сила сегодня." },
    { triggerType: "moon_in_sign", triggerValue: "taurus", category: "advice", textRu: "Позаботьтесь о комфорте — это не лишнее." },
    { triggerType: "moon_in_sign", triggerValue: "gemini", category: "love", textRu: "Разговоры сегодня важнее жестов." },
    { triggerType: "moon_in_sign", triggerValue: "gemini", category: "money", textRu: "Информация — ваш главный актив." },
    { triggerType: "moon_in_sign", triggerValue: "gemini", category: "mood", textRu: "Любопытство ведёт к открытиям." },
    { triggerType: "moon_in_sign", triggerValue: "gemini", category: "advice", textRu: "Напишите тому, о ком давно думали." },
    { triggerType: "moon_in_sign", triggerValue: "cancer", category: "love", textRu: "Забота о близких возвращается сторицей." },
    { triggerType: "moon_in_sign", triggerValue: "cancer", category: "money", textRu: "Интуиция подскажет верное решение." },
    { triggerType: "moon_in_sign", triggerValue: "cancer", category: "mood", textRu: "Дом — лучшее место сегодня." },
    { triggerType: "moon_in_sign", triggerValue: "cancer", category: "advice", textRu: "Позвоните родным — они ждут." },
    { triggerType: "moon_in_sign", triggerValue: "virgo", category: "love", textRu: "Внимание к деталям укрепит доверие." },
    { triggerType: "moon_in_sign", triggerValue: "virgo", category: "money", textRu: "Проверьте документы и расчёты." },
    { triggerType: "moon_in_sign", triggerValue: "virgo", category: "mood", textRu: "Порядок в делах — порядок в голове." },
    { triggerType: "moon_in_sign", triggerValue: "virgo", category: "advice", textRu: "Составьте список дел — это поможет." },
    { triggerType: "moon_in_sign", triggerValue: "libra", category: "love", textRu: "Гармония в отношениях требует компромисса." },
    { triggerType: "moon_in_sign", triggerValue: "libra", category: "money", textRu: "Партнёрство может быть выгодным." },
    { triggerType: "moon_in_sign", triggerValue: "libra", category: "mood", textRu: "Красота вокруг поднимает настроение." },
    { triggerType: "moon_in_sign", triggerValue: "libra", category: "advice", textRu: "Найдите баланс между «надо» и «хочу»." },
    { triggerType: "moon_in_sign", triggerValue: "scorpio", category: "love", textRu: "Глубина чувств требует доверия." },
    { triggerType: "moon_in_sign", triggerValue: "scorpio", category: "money", textRu: "Скрытые ресурсы могут проявиться." },
    { triggerType: "moon_in_sign", triggerValue: "scorpio", category: "mood", textRu: "Интенсивность эмоций — это нормально." },
    { triggerType: "moon_in_sign", triggerValue: "scorpio", category: "advice", textRu: "Отпустите то, что уже не нужно." },
    { triggerType: "moon_in_sign", triggerValue: "sagittarius", category: "love", textRu: "Открытость привлекает — будьте искренни." },
    { triggerType: "moon_in_sign", triggerValue: "sagittarius", category: "money", textRu: "Перспективы расширяются — смотрите дальше." },
    { triggerType: "moon_in_sign", triggerValue: "sagittarius", category: "mood", textRu: "Оптимизм заразителен — делитесь им." },
    { triggerType: "moon_in_sign", triggerValue: "sagittarius", category: "advice", textRu: "Запланируйте что-то новое на ближайшее время." },
    { triggerType: "moon_in_sign", triggerValue: "capricorn", category: "love", textRu: "Серьёзный разговор сблизит вас." },
    { triggerType: "moon_in_sign", triggerValue: "capricorn", category: "money", textRu: "Стратегическое мышление сегодня в приоритете." },
    { triggerType: "moon_in_sign", triggerValue: "capricorn", category: "mood", textRu: "Дисциплина приносит удовлетворение." },
    { triggerType: "moon_in_sign", triggerValue: "capricorn", category: "advice", textRu: "Поставьте конкретную цель на неделю." },
    { triggerType: "moon_in_sign", triggerValue: "aquarius", category: "love", textRu: "Оригинальность привлекает внимание." },
    { triggerType: "moon_in_sign", triggerValue: "aquarius", category: "money", textRu: "Нестандартные идеи могут сработать." },
    { triggerType: "moon_in_sign", triggerValue: "aquarius", category: "mood", textRu: "Свобода мысли — ключ к хорошему дню." },
    { triggerType: "moon_in_sign", triggerValue: "aquarius", category: "advice", textRu: "Попробуйте что-то совершенно новое." },
    { triggerType: "moon_in_sign", triggerValue: "pisces", category: "love", textRu: "Романтика в воздухе — ловите момент." },
    { triggerType: "moon_in_sign", triggerValue: "pisces", category: "money", textRu: "Творческий подход к финансам поможет." },
    { triggerType: "moon_in_sign", triggerValue: "pisces", category: "mood", textRu: "Мечтательность сегодня уместна." },
    { triggerType: "moon_in_sign", triggerValue: "pisces", category: "advice", textRu: "Найдите время для себя и тишины." },
    { triggerType: "moon_phase", triggerValue: "new_moon", category: "love", textRu: "Новолуние — время для новых начинаний в отношениях." },
    { triggerType: "moon_phase", triggerValue: "new_moon", category: "money", textRu: "Посадите семена будущих проектов." },
    { triggerType: "moon_phase", triggerValue: "new_moon", category: "advice", textRu: "Поставьте намерение на лунный цикл." },
    { triggerType: "moon_phase", triggerValue: "full_moon", category: "love", textRu: "Полнолуние усиливает эмоции — будьте мягче." },
    { triggerType: "moon_phase", triggerValue: "full_moon", category: "mood", textRu: "Эмоции на пике — это временно." },
    { triggerType: "moon_phase", triggerValue: "full_moon", category: "advice", textRu: "Завершите то, что начали две недели назад." },
    { triggerType: "day_of_week", triggerValue: "monday", category: "advice", textRu: "Начните неделю с главного." },
    { triggerType: "day_of_week", triggerValue: "friday", category: "mood", textRu: "Конец недели — отпустите напряжение." },
    { triggerType: "day_of_week", triggerValue: "sunday", category: "advice", textRu: "Восстановите силы перед новой неделей." },
  ]

  const existingTemplates = await prisma.contentTemplate.count()
  if (existingTemplates === 0) {
    await prisma.contentTemplate.createMany({ data: templates })
    console.log("Content templates seeded")
  } else {
    console.log("Content templates already exist, skipping")
  }

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
