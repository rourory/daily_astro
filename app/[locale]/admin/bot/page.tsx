import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

async function checkAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("admin_auth")
  return authCookie?.value === process.env.ADMIN_PASSWORD
}

async function getBotInfo() {
  const BOT_TOKEN = process.env.BOT_TOKEN
  if (!BOT_TOKEN) return null

  try {
    const [meRes, webhookRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`),
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`),
    ])
    const me = await meRes.json()
    const webhook = await webhookRes.json()
    return { bot: me.result, webhook: webhook.result }
  } catch {
    return null
  }
}

async function getDeliveryStats() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [todayCount, weekCount, totalCount] = await Promise.all([
      prisma.delivery.count({
        where: {
          deliveryDate: {
            gte: today,
          },
        },
      }),
      prisma.delivery.count({
        where: {
          deliveryDate: {
            gte: weekAgo,
          },
        },
      }),
      prisma.delivery.count(),
    ])

    return {
      today: todayCount,
      week: weekCount,
      total: totalCount,
    }
  } catch {
    return { today: 0, week: 0, total: 0 }
  }
}

export default async function BotPage() {
  const isAuthenticated = await checkAuth()
  if (!isAuthenticated) redirect("/admin/login")

  const [botInfo, stats] = await Promise.all([getBotInfo(), getDeliveryStats()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Telegram Bot</h2>
        <a
          href="/api/init"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-colors"
          rel="noreferrer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Переустановить Webhook
        </a>
      </div>

      {botInfo?.webhook?.last_error_message && (
        <div className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <div className="font-semibold text-red-400 mb-1">Ошибка Webhook</div>
              <div className="text-sm text-red-300">{botInfo.webhook.last_error_message}</div>
              {botInfo.webhook.last_error_date && (
                <div className="text-xs text-red-400/70 mt-2">
                  Последняя ошибка: {new Date(botInfo.webhook.last_error_date * 1000).toLocaleString("ru-RU")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bot Info */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold mb-4">Информация о боте</h3>
          {botInfo?.bot ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <div className="font-semibold">@{botInfo.bot.username}</div>
                  <div className="text-sm text-zinc-500">{botInfo.bot.first_name}</div>
                </div>
              </div>
              <div className="text-sm text-zinc-400">ID: {botInfo.bot.id}</div>
            </div>
          ) : (
            <p className="text-zinc-500">BOT_TOKEN не настроен</p>
          )}
        </div>

        {/* Webhook Status */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-lg font-semibold mb-4">Статус Webhook</h3>
          {botInfo?.webhook ? (
            <div className="space-y-3">
              <div
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  botInfo.webhook.url && !botInfo.webhook.last_error_message
                    ? "bg-green-500/20 text-green-400"
                    : botInfo.webhook.last_error_message
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                {botInfo.webhook.url && !botInfo.webhook.last_error_message
                  ? "✓ Работает"
                  : botInfo.webhook.last_error_message
                    ? "⚠ Ошибка"
                    : "✗ Не настроен"}
              </div>
              <div className="text-sm">
                <span className="text-zinc-500">URL:</span>
                <div className="mt-1 p-2 bg-zinc-800 rounded font-mono text-xs break-all">
                  {botInfo.webhook.url || "—"}
                </div>
              </div>
              {botInfo.webhook.pending_update_count > 0 && (
                <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 text-sm">
                  ⚠️ Ожидает обработки: {botInfo.webhook.pending_update_count} сообщений
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-500">Не удалось получить информацию</p>
          )}
        </div>
      </div>

      {/* Delivery Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm text-zinc-500 mb-1">Доставлено сегодня</div>
          <div className="text-3xl font-bold">{stats.today}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm text-zinc-500 mb-1">За неделю</div>
          <div className="text-3xl font-bold">{stats.week}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm text-zinc-500 mb-1">Всего</div>
          <div className="text-3xl font-bold text-cyan-400">{stats.total}</div>
        </div>
      </div>
    </div>
  )
}
