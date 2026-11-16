import type { PGlite, Transaction } from '@electric-sql/pglite'
import type { Db } from './db'

/** Db adapter over PGlite (Postgres in WASM), for tests and local development. */
export const pgliteDb = (pg: PGlite): Db => {
  const wrap = (conn: PGlite | Transaction, root?: PGlite): Db => ({
    query: async <T>(text: string, params: unknown[] = []) =>
      (await conn.query(text, params)).rows as T[],
    exec: async (script) => {
      await conn.exec(script)
    },
    transaction: async (fn) =>
      root ? root.transaction((tx) => fn(wrap(tx))) : fn(wrap(conn)),
  })
  return wrap(pg, pg)
}
