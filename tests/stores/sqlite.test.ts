import { Database } from "sqlite";

import { assertArrayIncludes, assertEquals, assertObjectMatch } from "std/assert/mod.ts";
import { beforeEach, describe, it } from "std/testing/bdd.ts";

import type { Role } from "~libraries/role.ts";
import { ActionValidator, type Permissions, type Roles } from "~libraries/types.ts";

import { SQLiteAuth } from "../../stores/sqlite.ts";

const permissions = {
  users: {
    create: true,
    read: new ActionValidator({
      filter: ["name"],
    }),
    update: true,
    delete: true,
  },
} as const satisfies Permissions;

type AppPermissions = typeof permissions;

const roles = {
  admin: {
    users: ["create", "read", "update", "delete"],
  },
} as const satisfies Roles<AppPermissions>;

/*
 |--------------------------------------------------------------------------------
 | Tests
 |--------------------------------------------------------------------------------
 */

describe("SQLite Auth", () => {
  let auth: SQLiteAuth<AppPermissions>;

  let role: Role<AppPermissions>;

  beforeEach(async () => {
    auth = getAuth();
    role = await auth.roles.addRole({
      tenantId: "tenant-a",
      name: "admin",
      permissions: {
        users: {
          create: true,
          read: true,
        },
      },
    });
  });

  describe("Roles", () => {
    it("should successfully create a role", async () => {
      assertObjectMatch((await auth.roles.getRole(role.roleId))!, {
        name: "admin",
        permissions: {
          users: {
            create: true,
            read: true,
          },
        },
      });
    });

    it("should successfully add a user", async () => {
      await role.addUser("user-a");
      assertArrayIncludes(
        await auth.roles.getRolesByUserId("user-a").then((roles) => roles.map((role) => role.toJSON())),
        [
          {
            roleId: role.roleId,
            tenantId: "tenant-a",
            name: "admin",
            permissions: {
              users: {
                create: true,
                read: true,
              },
            },
          },
        ],
      );
    });

    it("should successfully add, and remove a user", async () => {
      await role.addUser("user-a");
      await role.delUser("user-a");
      assertEquals(
        await auth.roles.getRolesByUserId("user-a").then((roles) => roles.map((role) => role.toJSON())),
        [],
      );
    });
  });

  describe("Access", () => {
    it("should successfully get access instance for user", async () => {
      await role.addUser("user-a");

      const access = await auth.getAccess("tenant-a", "user-a");

      assertEquals(access.check("users", "create").granted, true);
      assertEquals(access.check("users", "update").granted, false);
      assertEquals(access.check("users", "read").granted, true);
      assertEquals(
        access.check("users", "read").filter({
          name: "John Doe",
          email: "john.doe@fixture.none",
        }),
        { name: "John Doe" } as any,
      );
    });
  });
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getAuth() {
  return new SQLiteAuth<AppPermissions>({
    database: new Database(":memory:"),
    permissions,
    roles,
  });
}
