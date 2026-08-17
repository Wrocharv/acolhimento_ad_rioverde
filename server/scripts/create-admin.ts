import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import { admins } from "../../drizzle/schema";

async function main() {
  const [, , email, password, name] = process.argv;
  if (!email || !password || !name) {
    console.error("Uso: pnpm admin:create <email> <senha> <nome>");
    process.exitCode = 1;
    return;
  }

  const db = getDb();
  if (!db) {
    console.error("DATABASE_URL não configurada.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(admins)
    .values({ email: email.toLowerCase().trim(), passwordHash, name })
    .returning();

  console.log(`Admin criado: ${created.email} (id ${created.id})`);
}

main().then(() => process.exit(0));
