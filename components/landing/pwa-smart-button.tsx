"use client";

import { useState, useEffect } from "react";
import { usePwa } from "@/hooks/use-pwa";
import InstallAppButton from "./install-app-button";
import LoginButton from "./login-button";
import { useRouter } from "@/lib/navigation";
import ShowForecastButton from "./show-forecast-button";

interface SmartActionButtonProps {
  isLoggedIn: boolean; // Получаем статус от родителя (Server Component)
}

export default function SmartPWAActionButton({
  isLoggedIn,
}: SmartActionButtonProps) {
  const router = useRouter();
  const { isIOS, isInstallable, isStandalone, installApp } = usePwa();
  const [showIosHint, setShowIosHint] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Пока не сгидрировалось, возвращаем заглушку или null,
  // чтобы не было мерцания контента
  if (!mounted) return null;

  return (
    <div>
      {!isStandalone && (isInstallable || isIOS) && (
        <InstallAppButton
          installApp={installApp}
          isIOS={isIOS}
          setShowIosHint={setShowIosHint}
          showIosHint={showIosHint}
          className="mb-3"
        />
      )}
      {isLoggedIn ? <ShowForecastButton /> : <LoginButton />}
    </div>
  );
}
