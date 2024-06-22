import { assertArrayIncludes, assertEquals, assertObjectMatch } from "std/assert/mod.ts";
import { beforeEach, describe, it } from "std/testing/bdd.ts";

import type { Role } from "~libraries/role.ts";

import type { SQLiteAuth } from "../../stores/sqlite.ts";
import type { AppPermissions } from "./helpers/permissions.ts";
import { getSQLiteAuth } from "./helpers/utilities.ts";

describe("SQLite Auth", () => {
  let sqlite: SQLiteAuth<AppPermissions>;
  let token: string;
  let role: Role<AppPermissions>;

  beforeEach(async () => {
    sqlite = getSQLiteAuth();
    token = await sqlite.generate("tenant-a", "entity-a");
    role = await sqlite.roles.addRole({
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
      assertObjectMatch((await sqlite.roles.getRole(role.roleId))!, {
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
      await role.addEntity("entity-a");
      assertArrayIncludes(
        await sqlite.roles.getRolesByUserId("entity-a").then((roles) => roles.map((role) => role.toJSON())),
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
      await role.addEntity("entity-a");
      await role.delEntity("entity-a");
      assertEquals(
        await sqlite.roles.getRolesByUserId("entity-a").then((roles) => roles.map((role) => role.toJSON())),
        [],
      );
    });
  });

  describe("Access", () => {
    it("should successfully get access instance for user", async () => {
      await role.addEntity("entity-a");

      const auth = await sqlite.resolve(token);

      assertEquals(auth.access.check("users", "create").granted, true);
      assertEquals(auth.access.check("users", "update").granted, false);
      assertEquals(auth.access.check("users", "read").granted, true);
      assertEquals(
        auth.access.check("users", "read").filter({
          name: "John Doe",
          email: "john.doe@fixture.none",
        }),
        { name: "John Doe" } as any,
      );
    });
  });
});
