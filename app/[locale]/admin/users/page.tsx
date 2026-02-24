import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ZodiacSign, SubscriptionStatus } from "@/lib/types/enums" // Или из prisma/client
import { ZODIAC_SYMBOLS } from "@/lib/astro/ephemeris" // Убедитесь, что этот импорт работает, либо используйте заглушку ниже
import { UserService } from "@/lib/dal/services"
import { UserFilters } from "@/components/landing/admin/user-filters"
import { Pagination } from "@/components/landing/admin/pagination"

// Если ZODIAC_SYMBOLS нет, раскомментируйте это:
// const ZODIAC_SYMBOLS: Record<string, string> = {
//   aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋", leo: "♌", virgo: "♍",
//   libra: "♎", scorpio: "♏", sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓"
// }

export const dynamic = "force-dynamic"

async function checkAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("admin_auth")
  return authCookie?.value === process.env.ADMIN_PASSWORD
}

// Хелпер для определения статуса пользователя для UI
const getUserStatusInfo = (user: any) => {
  const sub = user.subscriptions[0] // Берем первую (актуальную) подписку

  if (user.isPaused) {
    return { label: "Paused", color: "bg-yellow-500/20 text-yellow-400" }
  }
  
  if (!sub) {
    return { label: "Free", color: "bg-zinc-800 text-zinc-500" }
  }

  switch (sub.status) {
    case SubscriptionStatus.active: return { label: "Active", color: "bg-green-500/20 text-green-400" }
    case SubscriptionStatus.trial: return { label: "Trial", color: "bg-cyan-500/20 text-cyan-400" }
    case SubscriptionStatus.grace: return { label: "Grace", color: "bg-orange-500/20 text-orange-400" }
    default: return { label: sub.status, color: "bg-zinc-800 text-zinc-500" }
  }
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    zodiac?: string
  }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  const isAuthenticated = await checkAuth()
  if (!isAuthenticated) redirect("/admin/login")

  const params = await searchParams
  const currentPage = Number(params.page) || 1
  const query = params.search || ""
  const zodiacFilter = params.zodiac as ZodiacSign | undefined

  const { data: users, metadata } = await UserService.findManyWithPagination({
    page: currentPage,
    limit: 15,
    search: query,
    zodiacSign: zodiacFilter,
  })

  return (
    <div className="space-y-6 max-w-[100vw] overflow-x-hidden p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-zinc-100">Пользователи</h2>
        <div className="text-zinc-500 text-sm">
          Всего: {metadata.total}
        </div>
      </div>

      <UserFilters />

      {/* ----------------- MOBILE VIEW (CARDS) ----------------- */}
      <div className="grid gap-4 md:hidden">
        {users.map((user) => {
          const statusInfo = getUserStatusInfo(user)
          const sub = user.subscriptions[0]

          return (
            <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium text-zinc-200 truncate" title={user.telegramId?.toString()}>
                     {user.telegramId ? `TG: ${user.telegramId}` : user.email || "—"}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                    <span>{user.zodiacSign ? ZODIAC_SYMBOLS[user.zodiacSign] : "—"}</span>
                    <span className="capitalize">{user.zodiacSign || "Без знака"}</span>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="text-sm text-zinc-400 border-t border-zinc-800 pt-3 space-y-2">
                 <div className="flex justify-between">
                   <span>Тариф:</span>
                   <span className={`capitalize ${sub ? 'text-cyan-400' : 'text-zinc-600'}`}>
                     {sub?.plan.name || "Нет"}
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span>Регистрация:</span>
                   <span>{new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
                 </div>
                 <div className="flex justify-between">
                    <span>Время рассылки:</span>
                    <span>{user.deliveryTime}</span>
                 </div>
              </div>
            </div>
          )
        })}
        
        {users.length === 0 && (
          <div className="text-center text-zinc-500 py-8">Ничего не найдено</div>
        )}
      </div>

      {/* ----------------- DESKTOP VIEW (TABLE) ----------------- */}
      <div className="hidden md:block rounded-lg border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr className="text-left text-sm text-zinc-400">
                <th className="p-4 whitespace-nowrap">Telegram ID / Email</th>
                <th className="p-4 whitespace-nowrap">Знак</th>
                <th className="p-4 whitespace-nowrap">Тариф</th>
                <th className="p-4 whitespace-nowrap">Статус</th>
                <th className="p-4 whitespace-nowrap">Регистрация</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const sub = user.subscriptions[0]
                const statusInfo = getUserStatusInfo(user)

                return (
                  <tr key={user.id} className="border-t border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4 font-medium text-zinc-200">
                      {user.telegramId?.toString() || user.email || "—"}
                    </td>
                    <td className="p-4">
                      {user.zodiacSign ? (
                        <span className="flex items-center gap-2" title={user.zodiacSign}>
                          <span className="text-lg leading-none">{ZODIAC_SYMBOLS[user.zodiacSign]}</span>
                          <span className="capitalize text-zinc-400 text-sm">{user.zodiacSign}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`capitalize text-sm ${sub?.plan.name ? "text-cyan-400" : "text-zinc-600"}`}>
                        {sub?.plan.name || "—"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-500 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                      })}
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    Нет пользователей по заданным критериям
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination totalPages={metadata.totalPages} currentPage={metadata.page} />
    </div>
  )
}