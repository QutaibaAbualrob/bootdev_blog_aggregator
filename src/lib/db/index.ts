import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";
import { readConfig } from "../../config.js";

/** Reads the DB connection string from the user's config file at import time. */
const config = readConfig();

/** Postgres connection pool shared by every query module. */
const conn = postgres(config.dbUrl);

/**
 * Shared Drizzle ORM instance used by all query functions in the project.
 */
export const db = drizzle(conn, { schema });
