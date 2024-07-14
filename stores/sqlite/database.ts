import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate as runMigration } from "drizzle-orm/bun-sqlite/migrator";
import type { Database as SQLiteDatabase } from "sqlite";

import { Database } from "~utilities/database.ts";

import { prepareMigrationFiles } from "../../utilities/migrations.ts";
import { schema as entities } from "./entities/schema.ts";
import { schema as roles } from "./roles/schema.ts";

const schema = { entities, roles };

/**
 * Takes a `npm:sqlite` database instance and returns a auth database.
 *
 * @param connection - SQLite connection to use for the database.
 */
export function makeAuthDatabase(connection: SQLiteDatabase) {
  return new Database<AuthDB>(drizzle(connection, { schema }), {
    async onCloseInstance() {
      connection.close();
    },
  });
}

/**
 * Takes a `npm:sqlite` database instance and migrates auth structure.
 *
 * @param connection - Connection to migrate against.
 * @param output     - Folder to place the migration files in.
 */
export async function migrate(connection: SQLiteDatabase, output: string): Promise<void> {
  await prepareMigrationFiles(import.meta, output);
  await runMigration(drizzle(connection, { schema }), {
    migrationsFolder: output,
    migrationsTable: "auth_migrations",
  });
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type AuthDB = BunSQLiteDatabase<{
  entities: typeof entities;
  roles: typeof roles;
}>;
