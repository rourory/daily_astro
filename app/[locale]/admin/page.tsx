import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SubscriptionStatus, PaymentStatus } from "@/lib/types/enums" // Используем ваши enum
import { Payment } from "@prisma/client"

export const dynamic = "force-dynamic"

async function checkAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("admin_auth")
  return authCookie?.value === process.env.ADMIN_PASSWORD
}

// Хелпер для форматирования денег
const formatMoney = (amount: number, currency: string) => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0, // Убираем копейки для компактности в дашборде
  }).format(amount / 100)
}

async function getStats() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Параллельные запросы
    const [totalUsers, activeSubscriptions, revenueGroups, todayDeliveries] = await Promise.all([
      // 1. Всего пользователей
      prisma.user.count(),

      // 2. Активные подписки
      prisma.subscription.count({ where: { status: SubscriptionStatus.active } }),

      // 3. Выручка (сгруппированная по валютам!)
      prisma.payment.groupBy({
        by: ["currency"],
        where: {
          status: PaymentStatus.succeeded,
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),

      // 4. Доставки сегодня
      prisma.delivery.count({ where: { deliveryDate: today } }),
    ])

    return {
      totalUsers,
      activeSubscriptions,
      // Преобразуем результат groupBy в удобный массив
      revenueByCurrency: revenueGroups.map((group) => ({
        currency: group.currency,
        amount: group._sum.amount || 0,
      })),
      todayDeliveries,
    }
  } catch (e) {
    console.error(e)
    return { 
      totalUsers: 0, 
      activeSubscriptions: 0, 
      revenueByCurrency: [], 
      todayDeliveries: 0 
    }
  }
}

async function getRecentActivity() {
  try {
    const [recentUsers, recentPayments] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true, zodiacSign: true, email: true, telegramId: true },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        // Выбираем amount и currency, чтобы показать детали
        select: { id: true, createdAt: true, status: true, amount: true, currency: true },
      }),
    ])

    // Объединяем и сортируем
    const activity = [
      ...recentUsers.map((u) => ({
        id: u.id,
        type: "user" as const,
        createdAt: u.createdAt,
        title: "Новый пользователь",
        detail: u.zodiacSign || "Без знака",
        subDetail: u.telegramId ? `TG: ${u.telegramId}` : u.email,
      })),
      ...recentPayments.map((p) => ({
        id: p.id,
        type: "payment" as const,
        createdAt: p.createdAt,
        title: "Платёж",
        detail: formatMoney(p.amount, p.currency),
        status: p.status,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)

    return activity
  } catch {
    return []
  }
}

export default async function AdminDashboard() {
  const isAuthenticated = await checkAuth()
  if (!isAuthenticated) redirect("/admin/login")

  const stats = await getStats()
  const activity = await getRecentActivity()

  return (
    <div className="space-y-6 p-4 max-w-[100vw] overflow-x-hidden">
      <h2 className="text-2xl font-bold text-zinc-100">Обзор</h2>

      {/* Grid с карточками статистики */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Карточка: Пользователи */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-zinc-400 mb-2">Пользователей</div>
          <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
        </div>

        {/* Карточка: Активные подписки */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-zinc-400 mb-2">Активные подписки</div>
          <div className="text-3xl font-bold text-cyan-400">{stats.activeSubscriptions}</div>
        </div>

        {/* Карточка: Выручка (Мультивалютная) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-zinc-400 mb-2">Выручка (месяц)</div>
          <div className="space-y-1">
            {stats.revenueByCurrency.length > 0 ? (
              stats.revenueByCurrency.map((item) => (
                <div key={item.currency} className="text-2xl font-bold text-green-400">
                  {formatMoney(item.amount, item.currency)}
                </div>
              ))
            ) : (
              <div className="text-2xl font-bold text-zinc-600">0 BYN</div>
            )}
          </div>
        </div>

        {/* Карточка: Доставки */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="text-sm font-medium text-zinc-400 mb-2">Доставлено сегодня</div>
          <div className="text-3xl font-bold text-white">{stats.todayDeliveries}</div>
        </div>
      </div>

      {/* Секция последней активности */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="font-semibold text-white">Последняя активность</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {activity.length > 0 ? (
            activity.map((item) => (
              <div key={item.id + item.type} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors gap-2">
                
                {/* Левая часть: Иконка (можно добавить) и Заголовок */}
                <div className="flex flex-col">
                  <span className={`font-medium ${item.type === 'payment' ? 'text-green-400' : 'text-blue-400'}`}>
                    {item.title}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(item.createdAt).toLocaleString("ru-RU", { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Правая часть: Детали */}
                <div className="flex flex-col sm:items-end">
                  <span className="text-zinc-200 font-medium capitalize">
                    {item.detail}
                  </span>
                  {/* Дополнительная инфо: Статус платежа или ID юзера */}
                  <span className="text-xs text-zinc-500">
                    {item.type === 'payment' ? (
                        <span className={`
                          ${item.status === PaymentStatus.succeeded ? 'text-green-500' : ''}
                          ${item.status === PaymentStatus.pending ? 'text-yellow-500' : ''}
                          ${item.status === PaymentStatus.failed ? 'text-red-500' : ''}
                        `}>
                          {item.status}
                        </span>
                    ) : (
                        item.subDetail
                    )}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-zinc-500">Нет данных</div>
          )}
        </div>
      </div>
    </div>
  )
}