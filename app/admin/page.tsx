import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SubscriptionStatus, PaymentStatus } from "@/lib/types/enums"

export const dynamic = "force-dynamic"

async function checkAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("admin_auth")
  return authCookie?.value === process.env.ADMIN_PASSWORD
}

async function getStats() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [totalUsers, activeSubscriptions, monthlyRevenue, todayDeliveries] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: SubscriptionStatus.active } }),
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.succeeded,
          createdAt: { gte: monthStart },
        },
        _sum: { amountByn: true },
      }),
      prisma.delivery.count({ where: { deliveryDate: today } }),
    ])

    return {
      totalUsers,
      activeSubscriptions,
      monthlyRevenue: (monthlyRevenue._sum.amountByn || 0) / 100,
      todayDeliveries,
    }
  } catch {
    return { totalUsers: 0, activeSubscriptions: 0, monthlyRevenue: 0, todayDeliveries: 0 }
  }
}

async function getRecentActivity() {
  try {
    const [recentUsers, recentPayments] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { createdAt: true, zodiacSign: true },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { createdAt: true, status: true },
      }),
    ])

    const activity = [
      ...recentUsers.map((u) => ({ type: "user" as const, createdAt: u.createdAt, detail: u.zodiacSign || "unknown" })),
      ...recentPayments.map((p) => ({ type: "payment" as const, createdAt: p.createdAt, detail: p.status })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10)

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
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Пользователей</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Активные подписки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Выручка (месяц)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{stats.monthlyRevenue.toFixed(2)} BYN</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Доставлено сегодня</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.todayDeliveries}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Последняя активность</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length > 0 ? (
            <div className="space-y-2">
              {activity.map((item, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">{item.type === "user" ? "Новый пользователь" : "Платёж"}</span>
                  <span className="text-zinc-300">{item.detail}</span>
                  <span className="text-zinc-500">{new Date(item.createdAt).toLocaleDateString("ru-RU")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">Нет данных</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
