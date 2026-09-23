import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import { registerPeopleRoutes } from "./people";
import { registerAdminRoutes } from "./admin";
import { registerVolunteerRoutes } from "./volunteers";
import { registerKidsRoutes } from "./kids";

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] Erro não tratado — servidor continua no ar", reason);
});

async function main() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "5mb" }));
  registerPeopleRoutes(app);
  registerAdminRoutes(app);
  registerVolunteerRoutes(app);
  registerKidsRoutes(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 3400;
  server.listen(port, () => {
    console.log(`[acolhimento_ad_rioverde] servidor rodando na porta ${port}`);
  });
}

main();
