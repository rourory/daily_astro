import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SubscribeContent } from "@/components/landing/subscribe-content";

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const telegramId = (await searchParams).telegramId;
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      }
    >
      <SubscribeContent telegramId={telegramId} />
    </Suspense>
  );
}
