import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { PaymentStatus } from "@/lib/types/enums"

export const dynamic = "force-dynamic"

async function checkAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("admin_auth")
  return authCookie?.value === process.env.ADMIN_PASSWORD
}

async function getPayments() {
  try {
    return await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: true,
        subscription: { include: { plan: true } },
      },
    })
  } catch {
    return []
  }
}

export default async function PaymentsPage() {
  const isAuthenticated = await checkAuth()
  if (!isAuthenticated) redirect("/admin/login")

  const payments = await getPayments()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Платежи</h2>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-900">
            <tr className="text-left text-sm text-zinc-400">
              <th className="p-4">ID заказа</th>
              <th className="p-4">Пользователь</th>
              <th className="p-4">Тариф</th>
              <th className="p-4">Сумма</th>
              <th className="p-4">Статус</th>
              <th className="p-4">Дата</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                <td className="p-4 font-mono text-xs text-zinc-400">{payment.orderId.slice(0, 12)}...</td>
                <td className="p-4 font-medium">{payment.user.telegramId?.toString() || payment.user.email || "—"}</td>
                <td className="p-4 capitalize text-cyan-400">{payment.subscription?.plan.name || "—"}</td>
                <td className="p-4 font-medium text-green-400">{(payment.amountByn / 100).toFixed(2)} BYN</td>
                <td className="p-4">
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      payment.status === PaymentStatus.succeeded
                        ? "bg-green-500/20 text-green-400"
                        : payment.status === PaymentStatus.pending
                          ? "bg-yellow-500/20 text-yellow-400"
                          : payment.status === PaymentStatus.refunded
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-zinc-500">{new Date(payment.createdAt).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">
                  Нет платежей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
