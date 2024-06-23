import { importPKCS8, importSPKI, jwtVerify, type KeyLike, SignJWT } from "jose";

import { Access } from "~libraries/access.ts";
import { Auth } from "~libraries/auth.ts";
import type { Repository } from "~libraries/repository.ts";
import type { Permissions } from "~libraries/types.ts";

import { db } from "./tables/db.ts";
import { repository } from "./tables/mod.ts";

export class SQLiteAuth<TPermissions extends Permissions> {
  readonly #permissions: TPermissions;
  readonly #auth: Config<TPermissions>["auth"];

  #secret?: KeyLike;
  #pubkey?: KeyLike;

  constructor(config: Config<TPermissions>) {
    this.#permissions = config.permissions;
    this.#auth = config.auth;
    db.instance = config.database;
  }

  /**
   * Get access to the auth roles repository.
   */
  get roles(): Repository<TPermissions> {
    return repository as unknown as Repository<TPermissions>;
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
  database: any;
  permissions: TPermissions;
  auth: {
    algorithm: string;
    privateKey: string;
    publicKey: string;
    issuer: string;
    audience: string;
  };
};
