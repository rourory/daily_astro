// lib/logger-client.ts

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogParams {
  action: string;
  message: string;
  meta?: Record<string, any>;
}

async function sendLog(source: string, level: LogLevel, params: LogParams) {
  // В деве пишем в консоль браузера
  if (process.env.NODE_ENV === "development") {
    console.log(`[${level}] ${params.message}`, params.meta);
  }

  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        source,
        action: params.action,
        message: params.message,
        meta: {
          ...params.meta,
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent:
            typeof window !== "undefined" ? navigator.userAgent : undefined,
        },
      }),
    });
  } catch (e) {
    // Тихо падаем, если логгер недоступен
    console.error("Logger failed", e);
  }
}

export const logger = {
  info: (source: string, message: string, meta?: any) =>
    sendLog(source, "INFO", { action: "info", message, meta }),

  warn: (source: string, action: string, message: string, meta?: any) =>
    sendLog(source, "WARN", { action, message, meta }),
  error: (source: string, action: string, error: any, meta?: any) =>
    sendLog(source, "ERROR", {
      action,
      message: error instanceof Error ? error.message : String(error),
      meta: {
        ...meta,
        stack: error instanceof Error ? error.stack : undefined,
      },
    }),
  event: (source: string, action: string, message: string, meta?: any) =>
    sendLog(source, "INFO", { action, message, meta }),
};
