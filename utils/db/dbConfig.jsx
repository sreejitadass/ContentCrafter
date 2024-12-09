// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Log the DATABASE_URL to verify it's loaded correctly
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Initialize the database connection using the environment variable
const sql = neon(process.env.DATABASE_URL);

// Initialize the drizzle ORM with the database connection and schema
export const db = drizzle(sql, { schema });
