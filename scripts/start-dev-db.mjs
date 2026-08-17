import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import fs from "node:fs";

const databaseDir = path.resolve(import.meta.dirname, "..", ".dev-pgdata");
const alreadyInitialised = fs.existsSync(databaseDir) && fs.readdirSync(databaseDir).length > 0;

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 5544,
  persistent: true,
});

if (!alreadyInitialised) await pg.initialise();
await pg.start();
console.log("READY postgresql://postgres:postgres@localhost:5544/postgres");
