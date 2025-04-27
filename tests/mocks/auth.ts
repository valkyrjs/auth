import { readFileSync } from "node:fs";
import { join } from "node:path";

import z from "zod";

import { Auth } from "../../libraries/auth.ts";
import { Guard } from "../../libraries/guard.ts";
import { RoleData } from "../../libraries/role.ts";

const accountTenants = {
  "account-a": ["tenant-a", "tenant-b"],
  "account-b": ["tenant-a", "tenant-c"],
} as any;

const req = {
  session: {
    accountId: "account-a",
  },
};

const roles = new Map<string, RoleData<any>>();
const assigned = new Map<string, RoleData<any>[]>();

export const auth = new Auth(
  {
    settings: {
      algorithm: "RS256",
      privateKey: readFileSync(join(import.meta.dirname!, "keys", "private"), "utf-8"),
      publicKey: readFileSync(join(import.meta.dirname!, "keys", "public"), "utf-8"),
      issuer: "https://valkyrjs.com",
      audience: "https://valkyrjs.com",
    },
    session: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("admin"),
        accountId: z.string(),
        super: z.boolean(),
      }),
      z.object({
        type: z.literal("user"),
        accountId: z.string(),
      }),
    ]),
    permissions: {
      account: ["create", "read", "update", "delete"],
    },
    guards: [
      new Guard("tenant:related", {
        input: z.object({ tenantId: z.string() }),
        check: async ({ tenantId }) => {
          return accountTenants[req.session.accountId]?.includes(tenantId);
        },
      }),
      new Guard("account:own", {
        input: z.object({ accountId: z.string() }),
        check: async ({ accountId }) => {
          return accountId === req.session.accountId;
        },
      }),
    ],
  },
  {
    roles: {
      async add(role) {
        roles.set(role.id, {
          id: role.id,
          name: role.name,
          permissions: role.permissions,
        });
      },

      async getById(roleId) {
        return roles.get(roleId);
      },

      async getBySession({ accountId }) {
        return assigned.get(accountId) ?? [];
      },

      async setPermissions() {},

      async delete(roleId) {
        roles.delete(roleId);
      },

      async assign(roleId: string, accountId: string): Promise<void> {
        const roleData = await this.getById(roleId);
        if (roleData !== undefined) {
          const target = assigned.get(accountId);
          if (target !== undefined) {
            assigned.set(accountId, [...target, roleData]);
          } else {
            assigned.set(accountId, [roleData]);
          }
        }
      },
    },
  },
);

await auth.roles.add({
  id: "admin",
  name: "Admin",
  permissions: {
    account: ["create", "read", "update", "delete"],
  },
});

await auth.roles.add({
  id: "moderator",
  name: "Moderator",
  permissions: {
    account: ["read", "update", "delete"],
  },
});

await auth.roles.add({
  id: "user",
  name: "User",
  permissions: {
    account: ["read", "update"],
  },
});

await auth.roles.assign("admin", "account-a");
await auth.roles.assign("moderator", "account-b");
await auth.roles.assign("user", "account-b");
