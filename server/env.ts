import "dotenv/config";

export const ENV = {
  databaseUrl: process.env.DATABASE_URL || "",
  publicAppUrl: process.env.PUBLIC_APP_URL || "http://localhost:3400",
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET || "dev-secret-change-me",
  nodeEnv: process.env.NODE_ENV || "development",
};
