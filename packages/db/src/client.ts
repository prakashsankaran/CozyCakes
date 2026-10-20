import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

export function createDb(url: string) {
  return drizzle(postgres(url, { max: 5 }), { schema });
}

let shared: Database | undefined;

/** Process-wide connection, created lazily from `DATABASE_URL`. */
export function getDb(): Database {
  if (!shared) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy apps/web/.env.example to .env.local.");
    shared = createDb(url);
  }
  return shared;
}
