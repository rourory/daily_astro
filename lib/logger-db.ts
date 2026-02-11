// lib/logger-db.ts
import { insertLogEntry } from "@/lib/db"
export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG"

interface LogParams {
  level: LogLevel
  source: string
  action: string
  message: string
  meta?: Record<string, any>
}

/**
 * Основная функция записи логов.
 * Вызывает insertLogEntry из db.ts
 */
export async function createSystemLog(params: LogParams) {
  try {
    // 1. Дублируем в консоль (только в dev)
    if (process.env.NODE_ENV === "development") {
      const color = 
        params.level === "ERROR" ? "\x1b[31m" : 
        params.level === "WARN" ? "\x1b[33m" :  
        params.level === "INFO" ? "\x1b[36m" : 
        "\x1b[32m"
      
      console.log(
        `${color}[${params.level}] [${params.source}] ${params.action}:\x1b[0m ${params.message}`, 
        params.meta ? JSON.stringify(params.meta, null, 2) : ""
      )
    }

    // 2. Пишем в базу данных (используем переименованную функцию)
    await insertLogEntry({
      level: params.level,
      source: params.source,
      action: params.action,
      message: params.message,
      meta: params.meta,
    })

  } catch (error) {
    console.error("CRITICAL: Logger failed to execute", error)
  }
}
