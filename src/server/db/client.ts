import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// The Supabase transaction pooler does not support prepared statements.
const sql = postgres(url, { prepare: false, max: 1 });

export const db = drizzle(sql, { schema });
