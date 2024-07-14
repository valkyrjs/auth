import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schema = sqliteTable("valkyr_role_entities", {
  roleId: text("role_id").notNull(),
  entityId: text("entity_id").notNull(),
  conditions: text("conditions"),
  filters: text("filters"),
}, (table) => ({
  roleIdIdx: index("role_id_idx").on(table.roleId),
  entityIdIx: index("entity_id_idx").on(table.entityId),
}));

export type Entity = typeof schema.$inferSelect;
