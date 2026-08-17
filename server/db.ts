import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "./env";
import * as schema from "../drizzle/schema";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!ENV.databaseUrl) {
    return null;
  }
  if (!db) {
    pool = new Pool({ connectionString: ENV.databaseUrl });
    db = drizzle(pool, { schema });
  }
  return db;
}
