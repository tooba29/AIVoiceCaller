import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Make sure your database is provisioned.");
}

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle", // directory for generated SQL
  dialect: "postgresql", // PostgreSQL dialect
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
