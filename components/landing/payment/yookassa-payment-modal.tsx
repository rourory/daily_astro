"use client";

import { useEffect, useRef, useState } from "react";
// 1. Импортируем createPortal
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger-client";
import {
  YooMoneyCheckoutWidgetConfig,
  YooMoneyCheckoutWidget,
} from "types-yoomoneycheckoutwidget";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmationToken: string | null;
  subscriptionId: string | null;
}

// declare global {
//   interface Window {
//     YooMoneyCheckoutWidget: any;
//   }
// }

export function YookassaPaymentModal({
  isOpen,
  onClose,
  confirmationToken,
  subscriptionId,
}: PaymentModalProps) {
  const [isWidgetScriptLoaded, setIsWidgetScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetInstanceRef = useRef<any>(null);
  const onCloseRef = useRef(onClose);

  // 2. Состояние для проверки, что мы на клиенте
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Загрузка скрипта
  useEffect(() => {
    if (document.getElementById("yookassa-script")) {
      setIsWidgetScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://yookassa.ru/checkout-widget/v1/checkout-widget.js";
    script.id = "yookassa-script";
    script.async = true;
    script.onload = () => setIsWidgetScriptLoaded(true);
    script.onerror = () => setError("Не удалось загрузить платежную форму");
    document.body.appendChild(script);
  }, []);

  // Инициализация виджета
  useEffect(() => {
    if (
      !isOpen ||
      !isWidgetScriptLoaded ||
      !confirmationToken ||
      !window.YooMoneyCheckoutWidget
    ) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const renderWidget = () => {
      const container = document.getElementById("payment-form-container");
      if (!container) {
        timeoutId = setTimeout(renderWidget, 50);
        return;
      }

      if (widgetInstanceRef.current) {
        widgetInstanceRef.current.destroy();
      }

      const config: YooMoneyCheckoutWidgetConfig = {
        confirmation_token: confirmationToken,
        error_callback: function (error: any) {
          console.error("Widget error:", error);
          if (error.error_code !== "payment_canceled") {
            setError("Ошибка инициализации оплаты");
          }
        },
      };

      try {
        const checkout = new window.YooMoneyCheckoutWidget(config);

        widgetInstanceRef.current = checkout;
        checkout.render("payment-form-container");

        checkout.on("success", async () => {});

        checkout.on("fail", () => {});

        checkout.on("complete", async (e: any) => {
          logger.info("Payment complete", { ...e });

          if (e.status === "fail") {
            setError("Оплата не прошла. Попробуйте еще раз.");
          } else if (e.status === "succeess") {
          }

          try {
            router.push(`/checkout/success`);
          } catch (e) {}
          setTimeout(() => {
            checkout.destroy();
          }, 1000);
        });
      } catch (e) {
        console.error(e);
        setError("Произошла ошибка при запуске формы");
      }
    };

    renderWidget();

    return () => {
      clearTimeout(timeoutId);
      if (widgetInstanceRef.current) {
        widgetInstanceRef.current.destroy();
        widgetInstanceRef.current = null;
      }
    };
  }, [isOpen, isWidgetScriptLoaded, confirmationToken, subscriptionId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Если не открыто или мы на сервере — ничего не рендерим
  if (!isOpen || !mounted) return null;

  // 3. Используем Портал. Это физически вынесет div модалки из карточки в конец <body>
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col animate-in fade-in duration-200">
      {/* Шапка */}
      <div className="flex-none h-16 border-b flex items-center justify-between px-4 sm:px-6 bg-white z-10 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold">
          Оплата пожертвования
        </h2>
        {/* <button
          onClick={onClose}
          className="rounded-full p-2 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-6 sm:w-6 sm:h-6 text-slate-600" />
        </button> */}
      </div>

      {/* Тело */}
      <div className="flex-1 overflow-y-auto w-full bg-slate-50/50">
        <div className="min-h-full flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-none sm:shadow-lg border-0 sm:border p-0 sm:p-8">
            <div className="w-full min-h-[300px] flex flex-col items-center justify-center">
              {!isWidgetScriptLoaded && !error && (
                <div className="flex flex-col items-center gap-2 py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">
                    Загрузка формы...
                  </p>
                </div>
              )}

              {error && (
                <div className="text-center text-destructive space-y-4 py-10">
                  <p>{error}</p>
                  <button
                    onClick={() => {
                      if (onCloseRef.current) onCloseRef.current();
                    }}
                    className="text-sm underline hover:no-underline"
                  >
                    Закрыть
                  </button>
                </div>
              )}

              <div id="payment-form-container" className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body, // Цель портала — body
  );
}
