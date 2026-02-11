import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SubscriptionStatus, ZODIAC_SYMBOLS, type ZodiacSign } from "@/lib/types/enums"

export const dynamic = "force-dynamic"

async function checkAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("admin_auth")
  return authCookie?.value === process.env.ADMIN_PASSWORD
}

async function getUsers() {
  try {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        subscriptions: {
          where: { status: { in: [SubscriptionStatus.active, SubscriptionStatus.trial, SubscriptionStatus.grace] } },
          include: { plan: true },
          take: 1,
        },
      },
    })
  } catch {
    return []
  }
}

export default async function UsersPage() {
  const isAuthenticated = await checkAuth()
  if (!isAuthenticated) redirect("/admin/login")

  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Пользователи</h2>
        <span className="text-zinc-500">Всего: {users.length}</span>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-900">
            <tr className="text-left text-sm text-zinc-400">
              <th className="p-4">Telegram ID</th>
              <th className="p-4">Знак</th>
              <th className="p-4">Тариф</th>
              <th className="p-4">Статус</th>
              <th className="p-4">Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const sub = user.subscriptions[0]
              return (
                <tr key={user.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                  <td className="p-4 font-medium">{user.telegramId?.toString() || "—"}</td>
                  <td className="p-4">
                    {user.zodiacSign && (
                      <span className="flex items-center gap-2">
                        <span>{ZODIAC_SYMBOLS[user.zodiacSign as ZodiacSign] || "⭐"}</span>
                        <span className="capitalize text-zinc-400">{user.zodiacSign}</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={sub?.plan.name ? "text-cyan-400 capitalize" : "text-zinc-600"}>
                      {sub?.plan.name || "—"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        sub?.status === SubscriptionStatus.active
                          ? "bg-green-500/20 text-green-400"
                          : sub?.status === SubscriptionStatus.trial
                            ? "bg-cyan-500/20 text-cyan-400"
                            : user.isPaused
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {sub?.status || (user.isPaused ? "paused" : "free")}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">{new Date(user.createdAt).toLocaleDateString("ru-RU")}</td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  Нет пользователей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
