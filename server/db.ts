import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";
import "dotenv/config";


if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create connection pool
const connectionString = process.env.DATABASE_URL;

// Create the raw postgres client for session store
export const pgClient = postgres(connectionString, {
  max: 20, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});

// Create database instance with schema
export const db = drizzle(pgClient, { schema });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await pgClient.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await pgClient.end();
  process.exit(0);
}); 