import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { ENV } from "../config/env.js";
import * as schema from "./schema.js";

export const pool = new Pool({
  connectionString: ENV.DATABASE_URL_POOLED || ENV.DATABASE_URL,
});

export const db = drizzle(pool, { schema });