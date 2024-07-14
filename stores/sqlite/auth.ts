/**
 * @module
 *
 * This module contains authorization and access control tooling.
 *
 * @example
 * ```ts
 * import { readFile } from "node:fs/promises";
 * import { join } from "node:path";
 * import { Database } from "bun:sqlite";
 *
 * import { SQLiteAuth } from "@valkyr/auth/sqlite";
 * import { ActionFilter, type Permissions } from "@valkyr/auth";
 *
 * const permissions = {
 *   account: {
 *     read: {
 *       filter: new ActionFilter(["entityId", "email"]),
 *     },
 *     update: true,
 *   },
 * } as const satisfies Permissions;
 *
 * export const auth = new SQLiteAuth({
 *   database: new Database(":memory:"),
 *   permissions,
 *   auth: {
 *     algorithm: "RS256",
 *     privateKey: await readFile(join(__dirname, ".keys", "private"), "utf-8"),
 *     publicKey: await readFile(join(__dirname, ".keys", "public"), "utf-8"),
 *     issuer: "https://valkyrjs.com",
 *     audience: "https://valkyrjs.com",
 *   },
 * });
 * ```
 */

import { importPKCS8, importSPKI, jwtVerify, type KeyLike, SignJWT } from "jose";
import type { Database as SQLiteDatabase } from "jsr:@db/sqlite@0.11";

import { Access } from "~libraries/access.ts";
import { Auth } from "~libraries/auth.ts";
import type { Permissions } from "~libraries/types.ts";
import type { Database } from "~utilities/database.ts";

import { type AuthDB, makeAuthDatabase } from "./database.ts";
import { EntityProvider } from "./entities/methods.ts";
import { RoleProvider } from "./roles/methods.ts";

/**
 * Provides a solution to manage user authentication and access control rights within an
 * application.
 */
export class SQLiteAuth<TPermissions extends Permissions> {
  readonly #database: Database<AuthDB>;
  readonly #permissions: TPermissions;
  readonly #auth: Config<TPermissions>["auth"];

  readonly entities: EntityProvider;
  readonly roles: RoleProvider<TPermissions>;

  #secret?: KeyLike;
  #pubkey?: KeyLike;

  constructor(config: Config<TPermissions>) {
    this.#database = makeAuthDatabase(config.database);
    this.#permissions = config.permissions;
    this.#auth = config.auth;

    this.entities = new EntityProvider(this.db);
    this.roles = new RoleProvider(this.db, this.entities);
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * Access the auth database instance.
   */
  get db(): AuthDB {
    return this.#database.instance;
  }

  /**
   * Secret key used to sign new tokens.
   */
  get secret(): Promise<KeyLike> {
    return new Promise((resolve) => {
      if (this.#secret === undefined) {
        importPKCS8(this.#auth.privateKey, this.#auth.algorithm).then((key) => {
          this.#secret = key;
          resolve(key);
        });
      } else {
        resolve(this.#secret);
      }
    });
  }

  /**
   * Public key used to verify tokens.
   */
  get pubkey(): Promise<KeyLike> {
    return new Promise<KeyLike>((resolve) => {
      if (this.#pubkey === undefined) {
        importSPKI(this.#auth.publicKey, this.#auth.algorithm).then((key) => {
          this.#pubkey = key;
          resolve(key);
        });
      } else {
        resolve(this.#pubkey);
      }
    });
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Generates a new access token from the given tenant and entity ids.
   *
   * @param tenantId   - Tenant id to assign to the token.
   * @param entityId   - Entity id to assign to the token.
   * @param expiration - Expiration date of the token. Default: 4 weeks
   */
  async generate(tenantId: string, entityId: string, expiration: string | number | Date = "4w"): Promise<string> {
    return new SignJWT({ tenantId, entityId })
      .setProtectedHeader({ alg: this.#auth.algorithm })
      .setIssuedAt()
      .setIssuer(this.#auth.issuer)
      .setAudience(this.#auth.audience)
      .setExpirationTime(expiration)
      .sign(await this.secret);
  }

  /**
   * Resolves a new auth instance from the given token.
   *
   * @param token - Token to resolve auth instance with.
   */
  async resolve(token: string): Promise<Auth<TPermissions>> {
    const { payload: { tenantId, entityId } } = await jwtVerify<{ tenantId: string; entityId: string }>(
      token,
      await this.pubkey,
      {
        issuer: this.#auth.issuer,
        audience: this.#auth.audience,
      },
    );
    return new Auth(
      tenantId,
      entityId,
      new Access<TPermissions>(this.#permissions, await this.roles.getRoles(tenantId, entityId)),
    );
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Config<TPermissions extends Permissions> = {
  database: SQLiteDatabase;
  permissions: TPermissions;
  auth: {
    algorithm: string;
    privateKey: string;
    publicKey: string;
    issuer: string;
    audience: string;
  };
};
