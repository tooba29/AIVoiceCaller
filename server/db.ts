import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import * as schema from "../shared/schema.js";
import "dotenv/config";


if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create connection pool
const connectionString = process.env.DATABASE_URL;

// Create the MySQL connection pool
export const mysqlClient = mysql.createPool(connectionString);

// Create database instance with schema
export const db = drizzle(mysqlClient, { schema, mode: "default" });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await mysqlClient.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await mysqlClient.end();
  process.exit(0);
}); 