import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PaymentStatus } from "@/lib/types/enums";
import { PaymentService } from "@/lib/dal/services";
import { PaymentFilters } from "@/components/landing/admin/payment-filters";
import { Pagination } from "@/components/landing/admin/pagination";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("admin_auth");
  return authCookie?.value === process.env.ADMIN_PASSWORD;
}

// Хелпер для форматирования валюты
const formatMoney = (amount: number, currency: string) => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency,
  }).format(amount / 100);
};

// Хелпер для цветов статуса
const getStatusColor = (status: string) => {
  switch (status) {
    case PaymentStatus.succeeded:
      return "bg-green-500/20 text-green-400";
    case PaymentStatus.pending:
      return "bg-yellow-500/20 text-yellow-400";
    case PaymentStatus.refunded:
      return "bg-blue-500/20 text-blue-400";
    case PaymentStatus.failed:
      return "bg-red-500/20 text-red-400";
    // case PaymentStatus.canceled: return "bg-zinc-500/20 text-zinc-400"
    default:
      return "bg-zinc-500/20 text-zinc-400";
  }
};

// Типизация пропсов страницы для Next.js App Router
interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) redirect("/admin/login");

  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const query = params.search || "";
  const statusFilter = params.status as PaymentStatus | undefined;

  // Получаем данные с пагинацией
  const { data: payments, metadata } =
    await PaymentService.findManyWithPagination({
      page: currentPage,
      limit: 15,
      search: query,
      status: statusFilter,
    });

  return (
    <div className="space-y-6 max-w-[100vw] overflow-x-hidden p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-zinc-100">Платежи</h2>
        <div className="text-zinc-500 text-sm">Всего: {metadata.total}</div>
      </div>

      {/* Фильтры */}
      <PaymentFilters />

      {/* ----------------- MOBILE VIEW (CARDS) ----------------- */}
      <div className="grid gap-4 md:hidden">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-zinc-500 font-mono mb-1">
                  #{payment.orderId.slice(0, 8)}
                </p>
                <p className="font-medium text-zinc-200">
                  {formatMoney(payment.amount, payment.currency)}
                </p>
              </div>
              <span
                className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.status)}`}
              >
                {payment.status}
              </span>
            </div>

            <div className="text-sm text-zinc-400 border-t border-zinc-800 pt-3 mt-3">
              <div className="flex justify-between py-1">
                <span>Пользователь:</span>
                <span className="text-zinc-200">
                  {payment.user.telegramId?.toString() ||
                    payment.user.email ||
                    "Аноним"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Тариф:</span>
                <span className="capitalize text-cyan-400">
                  {payment.subscription?.plan.name || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Дата:</span>
                <span>
                  {new Date(payment.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>
          </div>
        ))}
        {payments.length === 0 && (
          <div className="text-center text-zinc-500 py-8">
            Ничего не найдено
          </div>
        )}
      </div>

      {/* ----------------- DESKTOP VIEW (TABLE) ----------------- */}
      <div className="hidden md:block rounded-lg border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr className="text-left text-sm text-zinc-400">
                <th className="p-4 whitespace-nowrap">ID заказа</th>
                <th className="p-4 whitespace-nowrap">Пользователь</th>
                <th className="p-4 whitespace-nowrap">Тариф</th>
                <th className="p-4 whitespace-nowrap">Сумма</th>
                <th className="p-4 whitespace-nowrap">Статус</th>
                <th className="p-4 whitespace-nowrap">Дата</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900/50 transition-colors"
                >
                  <td
                    className="p-4 font-mono text-xs text-zinc-400"
                    title={payment.orderId}
                  >
                    {payment.orderId.slice(0, 12)}...
                  </td>
                  <td className="p-4 text-sm font-medium text-zinc-200">
                    {payment.user.telegramId?.toString() ||
                      payment.user.email ||
                      "—"}
                  </td>
                  <td className="p-4 text-sm capitalize text-cyan-400">
                    {payment.subscription?.plan.name || "—"}
                  </td>
                  <td className="p-4 text-sm font-medium text-green-400 whitespace-nowrap">
                    {formatMoney(payment.amount, payment.currency)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.status)}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-500 whitespace-nowrap">
                    {new Date(payment.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    Нет платежей по заданным критериям
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Пагинация */}
      <Pagination
        totalPages={metadata.totalPages}
        currentPage={metadata.page}
      />
    </div>
  );
}
