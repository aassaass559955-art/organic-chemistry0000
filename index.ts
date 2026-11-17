import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * The pool/drizzle instances are created LAZILY — on the first real database
 * query — and never at module import time.
 *
 * Why: `next build` evaluates every route module (pages, API routes,
 * sitemap.ts, metadata) to collect route config. A top-level
 * `throw new Error("DATABASE_URL is required")` therefore kills the build on
 * platforms like Vercel/Netlify where DATABASE_URL is only provisioned for
 * runtime. With this lazy proxy the module is import-safe during build, while
 * runtime behavior (and the error when a query is actually attempted without
 * the variable) is unchanged.
 */

const globalForDb = globalThis as typeof globalThis & {
  __ocPgPool?: Pool;
  __ocDrizzleDb?: NodePgDatabase;
};

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required at runtime. Set it in your environment " +
        "(Vercel/Netlify → Project Settings → Environment Variables)."
    );
  }
  if (!globalForDb.__ocPgPool) {
    globalForDb.__ocPgPool = new Pool({ connectionString: databaseUrl });
  }
  return globalForDb.__ocPgPool;
}

function createDb(): NodePgDatabase {
  if (!globalForDb.__ocDrizzleDb) {
    globalForDb.__ocDrizzleDb = drizzle(createPool());
  }
  return globalForDb.__ocDrizzleDb;
}

/** Lazily-bound drizzle client — drop-in replacement, no call-site changes needed. */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const real = createDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, prop) {
    return prop in (createDb() as object);
  },
});

/** Lazily-bound pg Pool (kept for compatibility with existing imports). */
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const real = createPool() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, prop) {
    return prop in (createPool() as object);
  },
});
