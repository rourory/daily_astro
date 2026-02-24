// app/admin/forecasts/page.tsx
import DatePickerForecasts from "@/components/ui/date-picker-forecasts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("admin_auth");
  return authCookie?.value === process.env.ADMIN_PASSWORD;
}

export default async function ForecastsPage() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) redirect("/admin/login");

  const today = new Date();

  return (
    <div className="space-y-6 p-2">
      {/* Передаём initialDate в клиентский компонент */}
      <DatePickerForecasts initialDate={today.toISOString().slice(0, 10)} />
    </div>
  );
}
