import { RolePermission } from "./role-permissions.ts";
import type { Permissions, RoleData, RolePermissions, RoleRepository } from "./types.ts";

export class Role<TPermissions extends Permissions> {
  readonly roleId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly permissions: RolePermissions<TPermissions>;

  readonly #repository: RoleRepository<TPermissions>;

  constructor(data: RoleData<TPermissions>, repository: RoleRepository<TPermissions>) {
    this.roleId = data.roleId;
    this.tenantId = data.tenantId;
    this.name = data.name;
    this.permissions = data.permissions;
    this.#repository = repository;
  }

  /*
   |--------------------------------------------------------------------------------
   | Permissions
   |--------------------------------------------------------------------------------
   */

  get grant() {
    return new RolePermission<TPermissions>(this, this.#repository).grant;
  }

  get deny() {
    return new RolePermission<TPermissions>(this, this.#repository).deny;
  }

  /*
   |--------------------------------------------------------------------------------
   | Accounts
   |--------------------------------------------------------------------------------
   */

  async addUser(userId: string) {
    await this.#repository.addUser(this.roleId, userId);
  }

  async delUser(userId: string) {
    await this.#repository.delUser(this.roleId, userId);
  }

  /*
   |--------------------------------------------------------------------------------
   | Methods
   |--------------------------------------------------------------------------------
   */

  update({ name, permissions }: UpdatePayload<TPermissions>) {
    return new Role({
      roleId: this.roleId,
      tenantId: this.tenantId,
      name: name ?? this.name,
      permissions: permissions ?? this.permissions,
    }, this.#repository);
  }

  /*
   |--------------------------------------------------------------------------------
   | Serializers
   |--------------------------------------------------------------------------------
   */

  toJSON(): {
    roleId: string;
    tenantId: string;
    name: string;
    permissions: RolePermissions<TPermissions>;
  } {
    return {
      roleId: this.roleId,
      tenantId: this.tenantId,
      name: this.name,
      permissions: this.permissions,
    };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type UpdatePayload<TPermissions extends Permissions> = {
  name?: string;
  permissions?: RolePermissions<TPermissions>;
};
