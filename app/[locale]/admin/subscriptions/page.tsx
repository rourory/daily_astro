import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SubscriptionStatus } from "@/lib/types/enums";
import { SubscriptionService } from "@/lib/dal/services";
import { Pagination } from "@/components/landing/admin/pagination";
import { SubscriptionFilters } from "@/components/landing/admin/subscription-filters";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("admin_auth");
  return authCookie?.value === process.env.ADMIN_PASSWORD;
}

// Хелпер форматирования цены
const formatPrice = (amount: number, currency: string) => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

// Хелпер цветов статуса (обновлен под ваши новые enum)
const getStatusColor = (status: string) => {
  switch (status) {
    case SubscriptionStatus.active:
      return "bg-green-500/20 text-green-400";
    case SubscriptionStatus.trial:
      return "bg-cyan-500/20 text-cyan-400";
    case SubscriptionStatus.grace:
      return "bg-orange-500/20 text-orange-400";
    // case SubscriptionStatus.paused: return "bg-yellow-500/20 text-yellow-400"
    case SubscriptionStatus.canceled:
      return "bg-red-500/20 text-red-400";
    case SubscriptionStatus.expired:
      return "bg-zinc-700/50 text-zinc-400";
    default:
      return "bg-zinc-800 text-zinc-500";
  }
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) redirect("/admin/login");

  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const query = params.search || "";
  const statusFilter = params.status as SubscriptionStatus | undefined;

  const { data: subscriptions, metadata } =
    await SubscriptionService.findManyWithPagination({
      page: currentPage,
      limit: 15,
      search: query,
      status: statusFilter,
    });

  return (
    <div className="space-y-6 max-w-[100vw] overflow-x-hidden p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-zinc-100">Подписки</h2>
        <div className="text-zinc-500 text-sm">Всего: {metadata.total}</div>
      </div>

      <SubscriptionFilters />

      {/* ----------------- MOBILE VIEW (CARDS) ----------------- */}
      <div className="grid gap-4 md:hidden">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 shadow-sm"
          >
            {/* Верхняя часть карточки: Юзер и статус */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="font-medium text-zinc-200">
                  {sub.user.telegramId?.toString() || sub.user.email || "—"}
                </span>
                <span className="text-xs text-zinc-500 capitalize">
                  Знак: {sub.user.zodiacSign || "?"}
                </span>
              </div>
              <span
                className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(sub.status)}`}
              >
                {sub.status}
              </span>
            </div>

            {/* Детали подписки */}
            <div className="text-sm text-zinc-400 border-t border-zinc-800 pt-3 space-y-2">
              <div className="flex justify-between">
                <span>Тариф:</span>
                <span className="capitalize text-cyan-400 font-medium">
                  {sub.plan.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Стоимость:</span>
                <span className="text-zinc-200">
                  {formatPrice(sub.priceAmount, sub.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Продление:</span>
                <span>
                  {sub.renewAt
                    ? new Date(sub.renewAt).toLocaleDateString("ru-RU")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Начало:</span>
                <span className="text-zinc-600">
                  {new Date(sub.startAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>
          </div>
        ))}
        {subscriptions.length === 0 && (
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
                <th className="p-4 whitespace-nowrap">Пользователь</th>
                <th className="p-4 whitespace-nowrap">Тариф</th>
                <th className="p-4 whitespace-nowrap">Цена</th>
                <th className="p-4 whitespace-nowrap">Статус</th>
                <th className="p-4 whitespace-nowrap">Продление</th>
                <th className="p-4 whitespace-nowrap">Создана</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="font-medium text-zinc-200">
                      {sub.user.telegramId?.toString() || sub.user.email || "—"}
                    </div>
                    <div className="text-xs text-zinc-500 capitalize">
                      {sub.user.zodiacSign || "—"}
                    </div>
                  </td>
                  <td className="p-4 capitalize text-cyan-400 font-medium">
                    {sub.plan.name}
                  </td>
                  <td className="p-4 text-zinc-300 font-mono text-sm whitespace-nowrap">
                    {formatPrice(sub.priceAmount, sub.currency)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(sub.status)}`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-400 whitespace-nowrap">
                    {sub.renewAt
                      ? new Date(sub.renewAt).toLocaleDateString("ru-RU")
                      : "—"}
                  </td>
                  <td className="p-4 text-sm text-zinc-600 whitespace-nowrap">
                    {new Date(sub.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    Нет подписок по заданным критериям
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Пагинация (общая с платежами) */}
      <Pagination
        totalPages={metadata.totalPages}
        currentPage={metadata.page}
      />
    </div>
  );
}
