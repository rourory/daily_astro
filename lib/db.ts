import { LogLevel } from "@prisma/client";
import { Pool, QueryResult, QueryResultRow } from "pg";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface CreateLogParams {
  level: LogLevel;
  source: string;
  action: string;
  message: string;
  meta?: any;
}

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// SQL template literal tag function compatible with neon's interface
export function sql<T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  // Build the query with $1, $2, etc. placeholders
  let query = strings[0];
  for (let i = 0; i < values.length; i++) {
    query += `$${i + 1}` + strings[i + 1];
  }

  return pool
    .query<T>(query, values)
    .then((result: QueryResult<T>) => result.rows);
}

// For raw queries when needed
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

// Get the pool for transactions or direct access
export function getPool(): Pool {
  return pool;
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
}

export default sql;

export async function insertLogEntry(
  params: CreateLogParams,
): Promise<boolean> {
  try {
    await prisma.systemLog.create({
      data: {
        level: params.level,
        source: params.source,
        action: params.action,
        message: params.message,
        meta: (params.meta || {}) as object,
      },
    });
    return true;
  } catch (error) {
    console.error("[DB] Failed to create system log:", error);
    return false;
  }
}

/**
 * Получает логи с пагинацией и фильтрацией
 */
export async function getSystemLogs(
  page = 1,
  pageSize = 50,
  filters?: { level?: LogLevel; source?: string },
) {
  noStore();

  const where: any = {};
  if (filters?.level) where.level = filters.level;
  if (filters?.source) where.source = filters.source;

  try {
    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.systemLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("[DB] Failed to fetch logs:", error);
    return { logs: [], total: 0, page, pageSize, totalPages: 0 };
  }
}
