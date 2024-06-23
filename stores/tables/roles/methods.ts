import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { Role } from "~libraries/role.ts";
import type { Operation, RoleData, RolePayload, RolePermissions } from "~libraries/types.ts";

import { schema as entitySchema } from "../entities/schema.ts";
import { db } from "../db.ts";
import { repository } from "../mod.ts";
import { schema } from "./schema.ts";
import { entities } from "../entities/methods.ts";

export const roles = {
  addRole,
  getRole,
  getRoles,
  getRolesByTenantId,
  getRolesByEntityId,
  setPermissions,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function addRole(payload: RolePayload<any>): Promise<Role<any>> {
  const roleId = nanoid();
  await db.insert(schema).values({
    roleId,
    ...payload,
    permissions: JSON.stringify(payload.permissions),
  });
  return new Role({ roleId, ...payload }, repository);
}

async function getRole(roleId: string): Promise<Role<any> | undefined> {
  return db.select().from(schema).where(eq(schema.roleId, roleId)).then((rows) => {
    const role = rows[0];
    if (role) {
      return new Role({ ...role, permissions: JSON.parse(role.permissions as any) }, repository);
    }
  });
}

async function getRoles(tenantId: string, entityId: string): Promise<Role<any>[]> {
  return db.select({
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

async function getRolesByTenantId(tenantId: string): Promise<Role<any>[]> {
  return db.select().from(schema).where(eq(schema.tenantId, tenantId)).then((data) =>
    data.map((role) =>
      new Role({
        ...role,
        permissions: JSON.parse(role.permissions),
      }, repository)
    )
  );
}

async function getRolesByEntityId(entityId: string): Promise<Role<any>[]> {
  return db.select({
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

async function setPermissions(
  roleId: string,
  operations: Operation[],
): Promise<RolePermissions<any>> {
  const role = await getRole(roleId);
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
  await db.update(schema).set({ permissions: JSON.stringify(permissions) }).where(eq(schema.roleId, roleId));
  return permissions;
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
