import { and, eq } from "drizzle-orm";

import type { RoleEntityAssignments } from "~libraries/types.ts";

import { db } from "../db.ts";
import { schema } from "./schema.ts";

export const entities = {
  addEntity,
  getEntity,
  setConditions,
  setFilters,
  delEntity,
} as const;

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function addEntity(roleId: string, entityId: string, assignments: RoleEntityAssignments = {}): Promise<void> {
  return db.insert(schema).values({
    roleId,
    entityId,
    conditions: assignments.conditions ? JSON.stringify(assignments.conditions) : undefined,
    filters: assignments.filters ? JSON.stringify(assignments.filters) : undefined,
  });
}

async function getEntity(roleId: string, entityId: string): Promise<
  {
    roleId: string;
    entityId: string;
    conditions: any;
    filters: any;
  } | undefined
> {
  return db.select().from(schema).where(and(eq(schema.roleId, roleId), eq(schema.entityId, entityId))).then(
    ([entity]) => {
      if (entity === undefined) {
        return undefined;
      }
      return {
        ...entity,
        conditions: JSON.parse(entity.conditions ?? "{}"),
        filters: JSON.parse(entity.filters ?? "{}"),
      };
    },
  );
}

async function setConditions(roleId: string, entityId: string, conditions: any): Promise<void> {
  return db.update(schema).set({ conditions: JSON.stringify(conditions) }).where(
    and(eq(schema.roleId, roleId), eq(schema.entityId, entityId)),
  );
}

async function setFilters(roleId: string, entityId: string, filters: any): Promise<void> {
  return db.update(schema).set({ filters: JSON.stringify(filters) }).where(
    and(eq(schema.roleId, roleId), eq(schema.entityId, entityId)),
  );
}

async function delEntity(roleId: string, entityId: string): Promise<void> {
  return db.delete(schema).where(and(
    eq(schema.roleId, roleId),
    eq(schema.entityId, entityId),
  ));
}
