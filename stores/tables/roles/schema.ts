import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schema = sqliteTable("valkyr_roles", {
  roleId: text("role_id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  permissions: text("permissions").notNull(),
}, (table) => ({
  tenantIdIdx: index("tenant_id_idx").on(table.tenantId),
}));
