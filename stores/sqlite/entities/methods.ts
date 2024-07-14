import { and, eq } from "drizzle-orm";

import type { RoleEntityAssignments } from "~libraries/types.ts";

import type { AuthDB } from "../database.ts";
import { schema } from "./schema.ts";

export class EntityProvider {
  constructor(readonly db: AuthDB) {}

  async addEntity(roleId: string, entityId: string, assignments: RoleEntityAssignments = {}): Promise<void> {
    return this.db.insert(schema).values({
      roleId,
      entityId,
      conditions: assignments.conditions ? JSON.stringify(assignments.conditions) : undefined,
      filters: assignments.filters ? JSON.stringify(assignments.filters) : undefined,
    });
  }

  async getEntity(roleId: string, entityId: string): Promise<
    {
      roleId: string;
      entityId: string;
      conditions: any;
      filters: any;
    } | undefined
  > {
    return this.db.select().from(schema).where(and(eq(schema.roleId, roleId), eq(schema.entityId, entityId))).then(
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

  async setConditions(roleId: string, entityId: string, conditions: any): Promise<void> {
    return this.db.update(schema).set({ conditions: JSON.stringify(conditions) }).where(
      and(eq(schema.roleId, roleId), eq(schema.entityId, entityId)),
    );
  }

  async setFilters(roleId: string, entityId: string, filters: any): Promise<void> {
    return this.db.update(schema).set({ filters: JSON.stringify(filters) }).where(
      and(eq(schema.roleId, roleId), eq(schema.entityId, entityId)),
    );
  }

  async delEntity(roleId: string, entityId: string): Promise<void> {
    return this.db.delete(schema).where(and(
      eq(schema.roleId, roleId),
      eq(schema.entityId, entityId),
    ));
  }
}
