import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { Role } from "~libraries/role.ts";
import type { Operation, Permissions, RoleData, RolePayload, RolePermissions } from "~libraries/types.ts";

import type { AuthDB } from "../database.ts";
import type { EntityProvider } from "../entities/methods.ts";
import { schema as entitySchema } from "../entities/schema.ts";
import { schema } from "./schema.ts";

export class RoleProvider<TPermissions extends Permissions> {
  constructor(readonly db: AuthDB, readonly entities: EntityProvider) {}

  async addRole(payload: RolePayload<TPermissions>): Promise<Role<TPermissions>> {
    const roleId = nanoid();
    await this.db.insert(schema).values({
      roleId,
      ...payload,
      permissions: JSON.stringify(payload.permissions),
    });
    return new Role({ roleId, ...payload }, repository);
  }

  async getRole(roleId: string): Promise<Role<TPermissions> | undefined> {
    return this.db.select().from(schema).where(eq(schema.roleId, roleId)).then((rows) => {
      const role = rows[0];
      if (role) {
        return new Role({ ...role, permissions: JSON.parse(role.permissions as any) }, repository);
      }
    });
  }

  async getRoles(tenantId: string, entityId: string): Promise<Role<TPermissions>[]> {
    return this.db.select({
      roleId: schema.roleId,
      tenantId: schema.tenantId,
      name: schema.name,
      permissions: schema.permissions,
    }).from(schema).innerJoin(
      entitySchema,
      eq(schema.roleId, entitySchema.roleId),
    ).where(and(
      eq(schema.tenantId, tenantId),
      eq(entitySchema.entityId, entityId),
    )).then((data) => {
      if (data.length === 0) {
        return [];
      }
      return override(entityId, data).then((roles) => roles.map((role) => new Role(role, repository)));
    });
  }

  async getRolesByTenantId(tenantId: string): Promise<Role<TPermissions>[]> {
    return this.db.select().from(schema).where(eq(schema.tenantId, tenantId)).then((data) =>
      data.map((role) =>
        new Role({
          ...role,
          permissions: JSON.parse(role.permissions),
        }, repository)
      )
    );
  }

  async getRolesByEntityId(entityId: string): Promise<Role<TPermissions>[]> {
    return this.db.select({
      roleId: schema.roleId,
      tenantId: schema.tenantId,
      name: schema.name,
      permissions: schema.permissions,
    }).from(schema).innerJoin(
      entitySchema,
      eq(schema.roleId, entitySchema.roleId),
    ).where(
      eq(entitySchema.entityId, entityId),
    ).then((data) => override(entityId, data).then((roles) => roles.map((role) => new Role(role, repository))));
  }

  async setPermissions(
    roleId: string,
    operations: Operation[],
  ): Promise<RolePermissions<TPermissions>> {
    const role = await this.getRole(roleId);
    if (role === undefined) {
      throw new Error(`Permission Violation: Cannot set permissions, role '${roleId}' does not exist.`);
    }
    const permissions = role.permissions;
    for (const operation of operations) {
      switch (operation.type) {
        case "set": {
          assign(permissions, operation.resource, operation.action, operation.data);
          break;
        }
        case "unset": {
          remove(permissions, operation.resource, operation.action);
          break;
        }
      }
    }
    await this.db.update(schema).set({ permissions: JSON.stringify(permissions) }).where(eq(schema.roleId, roleId));
    return permissions;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function assign(permissions: RoleData<any>["permissions"], resource: string, action: string, conditions: any): void {
  if (permissions[resource] === undefined) {
    permissions[resource] = {};
  }
  permissions[resource]![action] = conditions ?? true;
}

function remove(permissions: RoleData<any>["permissions"], resource: string, action?: string): void {
  if (action) {
    delete permissions[resource]?.[action];
  } else {
    delete permissions[resource];
  }
}

async function override(
  entityId: string,
  roles: { roleId: string; tenantId: string; name: string; permissions: string }[],
): Promise<RoleData<any>[]> {
  const result: RoleData<any>[] = [];
  for (const role of roles) {
    const entity = await entities.getEntity(role.roleId, entityId);
    result.push({
      ...role,
      permissions: entity === undefined
        ? JSON.parse(role.permissions)
        : leftFold(JSON.parse(role.permissions), { conditions: entity.conditions, filters: entity.filters }),
    });
  }
  return result;
}

function leftFold(target: any, { conditions, filters }: { conditions: any; filters: any }): any {
  for (const resource in conditions) {
    for (const action in conditions[resource]) {
      if (target[resource] === undefined) {
        target[resource] = {};
      }
      if (target[resource][action] === undefined) {
        target[resource][action] = {};
      }
      target[resource][action].conditions = conditions[resource][action];
    }
  }
  for (const resource in filters) {
    for (const action in filters[resource]) {
      if (target[resource] === undefined) {
        target[resource] = {};
      }
      if (target[resource][action] === undefined) {
        target[resource][action] = {};
      }
      target[resource][action].filter = filters[resource][action];
    }
  }
  return target;
}
