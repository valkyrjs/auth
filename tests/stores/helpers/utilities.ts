import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Database } from "sqlite";

import { SQLiteAuth } from "../../../stores/sqlite/auth.ts";
import { type AppPermissions, permissions } from "./permissions.ts";

export function getSQLiteAuth() {
  return new SQLiteAuth<AppPermissions>({
    database: new Database(":memory:"),
    permissions,
    auth: {
      algorithm: "RS256",
      privateKey: readFileSync(join(import.meta.dirname!, "..", "keys", "private"), "utf-8"),
      publicKey: readFileSync(join(import.meta.dirname!, "..", "keys", "public"), "utf-8"),
      issuer: "https://valkyrjs.com",
      audience: "https://valkyrjs.com",
    },
  });
}
