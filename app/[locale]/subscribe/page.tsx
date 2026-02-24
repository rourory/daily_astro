import { Suspense } from "react";
import {
  Loader2,
} from "lucide-react";
import { SubscribeContent } from "@/components/landing/subscribe-content";

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      }
    >
      <SubscribeContent />
    </Suspense>
  );
}