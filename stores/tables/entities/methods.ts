import { and, eq } from "drizzle-orm";

import { db } from "../db.ts";
import { schema } from "./schema.ts";

export const entities = {
  addEntity,
  delEntity,
} as const;

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function addEntity(roleId: string, entityId: string, conditions: any = {}): Promise<void> {
  await db.insert(schema).values({ roleId, entityId, conditions: JSON.stringify(conditions) });
}

async function delEntity(roleId: string, entityId: string): Promise<void> {
  await db.delete(schema).where(and(
    eq(schema.roleId, roleId),
    eq(schema.entityId, entityId),
  ));
}
