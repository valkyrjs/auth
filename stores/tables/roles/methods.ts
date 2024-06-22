import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import type { Operation, RoleData, RolePayload, RolePermissions, RoleRepository } from "~libraries/types.ts";

import { db } from "../db.ts";
import { schema } from "./schema.ts";
import { schema as roleUsersSchema } from "../role-users/schema.ts";
import { roleUsers } from "../role-users/methods.ts";
import { Role } from "~libraries/role.ts";

export const roles = {
  addRole,
  getRole,
  getRoles,
  getRolesByTenantId,
  getRolesByUserId,
  addUser: roleUsers.addUser,
  delUser: roleUsers.delUser,
  setPermissions,
} satisfies RoleRepository<any>;

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
  return new Role({ roleId, ...payload }, roles);
}

async function getRole(roleId: string): Promise<Role<any> | undefined> {
  return db.select().from(schema).where(eq(schema.roleId, roleId)).then((rows) => {
    const role = rows[0];
    if (role) {
      return new Role({ ...role, permissions: JSON.parse(role.permissions as any) }, roles);
    }
  });
}

async function getRoles(tenantId: string, userId: string): Promise<Role<any>[]> {
  return db.select({
    roleId: schema.roleId,
    tenantId: schema.tenantId,
    name: schema.name,
    permissions: schema.permissions,
  }).from(schema).innerJoin(
    roleUsersSchema,
    eq(schema.roleId, roleUsersSchema.roleId),
  ).where(and(
    eq(schema.tenantId, tenantId),
    eq(roleUsersSchema.userId, userId),
  )).then((data) => {
    if (data.length === 0) {
      return [];
    }
    return data.map((role) =>
      new Role({
        ...role,
        permissions: JSON.parse(role.permissions),
      }, roles)
    );
  });
}

async function getRolesByTenantId(tenantId: string): Promise<Role<any>[]> {
  return db.select().from(schema).where(eq(schema.tenantId, tenantId)).then((data) =>
    data.map((role) =>
      new Role({
        ...role,
        permissions: JSON.parse(role.permissions),
      }, roles)
    )
  );
}

async function getRolesByUserId(userId: string): Promise<Role<any>[]> {
  return db.select({
    roleId: schema.roleId,
    tenantId: schema.tenantId,
    name: schema.name,
    permissions: schema.permissions,
  }).from(schema).innerJoin(
    roleUsersSchema,
    eq(schema.roleId, roleUsersSchema.roleId),
  ).where(
    eq(roleUsersSchema.userId, userId),
  ).then((data) =>
    data.map((role) =>
      new Role({
        ...role,
        permissions: JSON.parse(role.permissions),
      }, roles)
    )
  );
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

function extend(source: any, target: any): any {
  for (const key in target) {
    if (
      typeof target[key] === "object" &&
      !Array.isArray(target[key]) &&
      Object.prototype.toString.call(target[key]) !== "[object Date]"
    ) {
      source[key] = extend(source[key] || {}, target[key]);
    } else {
      source[key] = target[key];
    }
  }
  return source;
}
