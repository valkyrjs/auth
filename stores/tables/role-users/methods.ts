import { and, eq } from "drizzle-orm";

import { db } from "../db.ts";
import { schema } from "./schema.ts";

export const roleUsers = {
  addUser,
  delUser,
} as const;

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function addUser(roleId: string, userId: string, conditions: any = {}): Promise<void> {
  await db.insert(schema).values({ roleId, userId, conditions: JSON.stringify(conditions) });
}

async function delUser(roleId: string, userId: string): Promise<void> {
  await db.delete(schema).where(and(
    eq(schema.roleId, roleId),
    eq(schema.userId, userId),
  ));
}
