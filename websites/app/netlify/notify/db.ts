import postgres from 'postgres'

/** Minimal SQL interface so the service can run on any Postgres (and PGlite in tests). */
export interface Db {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>
  /** Runs a multi-statement script without parameters (migrations). */
  exec(script: string): Promise<void>
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>
}

const wrap = (
  sql: postgres.Sql | postgres.TransactionSql,
  root?: postgres.Sql,
): Db => ({
  query: async <T>(text: string, params: unknown[] = []) =>
    (await sql.unsafe(
      text,
      params as postgres.ParameterOrJSON<never>[],
    )) as unknown as T[],
  exec: async (script) => {
    await sql.unsafe(script).simple()
  },
  transaction: async (fn) => {
    // Nested calls inside a transaction share it.
    if (!root) return fn(wrap(sql))
    return (await root.begin((tx) => fn(wrap(tx)))) as never
  },
})

let shared: { url: string; db: Db } | undefined

/**
 * One small connection per function instance, reused across warm
 * invocations. `prepare: false` keeps it compatible with transaction-mode
 * poolers (Supabase, Neon), which serverless deployments should use.
 */
export const connect = (url: string): Db => {
  if (shared?.url === url) return shared.db
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  })
  shared = { url, db: wrap(sql, sql) }
  return shared.db
}
