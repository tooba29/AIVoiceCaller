import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Make sure your database is provisioned.");
}

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle", // directory for generated SQL
  dialect: "postgresql", // PostgreSQL dialect
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "voice_caller",
    ssl: false // Disable SSL for local development
  },
});
