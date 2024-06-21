import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schema = sqliteTable("valkyr_role_users", {
  roleId: text("role_id").notNull(),
  userId: text("user_id").notNull(),
  conditions: text("conditions").notNull(),
}, (table) => ({
  roleIdIdx: index("role_id_idx").on(table.roleId),
  userIdIx: index("user_id_idx").on(table.userId),
}));

export type RoleUser = typeof schema.$inferSelect;
