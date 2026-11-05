/**
 * The database connection, shared by all services.
 *
 * Why it matters: this is the only way into the database, and only files in src/server/services
 * should import it (architecture rule 2). It connects with the server's own credentials from
 * DATABASE_URL, which never reach the browser. "server-only" makes the build fail if a browser
 * component imports this file by mistake.
 */

import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// The Supabase transaction pooler does not support prepared statements.
// max: 1 keeps one connection per server function; Vercel runs many small functions at once.
const sql = postgres(url, { prepare: false, max: 1 });

export const db = drizzle(sql, { schema });
