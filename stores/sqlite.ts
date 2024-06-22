import { Access } from "~libraries/access.ts";
import type { Permissions, RoleRepository, Roles } from "~libraries/types.ts";

import { roles } from "./tables/roles/methods.ts";
import { db } from "./tables/db.ts";

export class SQLiteAuth<TPermissions extends Permissions> {
  readonly #permissions: TPermissions;
  readonly #roles: Roles<TPermissions>;

  constructor(config: Config<TPermissions>) {
    this.#permissions = config.permissions;
    this.#roles = config.roles;
    db.instance = config.database;
  }

  /**
   * Get access to the auth roles repository.
   */
  get roles(): RoleRepository<TPermissions> {
    return roles as unknown as RoleRepository<TPermissions>;
  }

  /**
   * Get access for user under given tenant.
   *
   * @param tenantId - Tenant id the to fetch permissions under.
   * @param userId   - User to fetch permissions for.
   */
  async getAccess(tenantId: string, userId: string): Promise<Access<TPermissions>> {
    return new Access<TPermissions>(this.#permissions, await this.roles.getRoles(tenantId, userId));
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
  roles: Roles<TPermissions>;
};
