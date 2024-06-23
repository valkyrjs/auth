import { assertArrayIncludes, assertEquals, assertObjectMatch } from "std/assert/mod.ts";
import { beforeEach, describe, it } from "std/testing/bdd.ts";

import type { Role } from "~libraries/role.ts";

import type { SQLiteAuth } from "../../../stores/sqlite.ts";
import type { AppPermissions } from "../helpers/permissions.ts";
import { getSQLiteAuth } from "../helpers/utilities.ts";

const TENANT_ID = "tenant-a";
const ENTITY_ID = "entity-a";

let sqlite: SQLiteAuth<AppPermissions>;
let role: Role<AppPermissions>;

describe("Roles", () => {
  beforeEach(async () => {
    sqlite = getSQLiteAuth();
    role = await sqlite.roles.addRole({
      tenantId: TENANT_ID,
      name: "admin",
      permissions: {
        users: {
          create: {
            conditions: {
              tenantId: TENANT_ID,
            },
          },
          read: {
            filter: ["name", "email"],
          },
          update: true,
          delete: true,
        },
      },
    });
    await role.addEntity(ENTITY_ID);
  });

  it("should successfully create a role", async () => {
    assertObjectMatch((await sqlite.roles.getRole(role.roleId))!, {
      name: "admin",
      permissions: {
        users: {
          create: {
            conditions: {
              tenantId: TENANT_ID,
            },
          },
          read: {
            filter: ["name", "email"],
          },
          update: true,
          delete: true,
        },
      },
    });
  });

  it("should successfully add a entity", async () => {
    assertArrayIncludes(
      await sqlite.roles.getRolesByEntityId(ENTITY_ID).then((roles) => roles.map((role) => role.toJSON())),
      [
        {
          roleId: role.roleId,
          tenantId: TENANT_ID,
          name: "admin",
          permissions: {
            users: {
              create: {
                conditions: {
                  tenantId: TENANT_ID,
                },
              },
              read: {
                filter: ["name", "email"],
              },
              update: true,
              delete: true,
            },
          },
        },
      ],
    );
  });

  it("should successfully add, and remove a entity", async () => {
    await role.delEntity(ENTITY_ID);
    assertEquals(
      await sqlite.roles.getRolesByEntityId(ENTITY_ID).then((roles) => roles.map((role) => role.toJSON())),
      [],
    );
  });

  it("should successfully set custom conditions and filters for a entity", async () => {
    await sqlite.roles.setConditions(role.roleId, ENTITY_ID, {
      users: {
        create: {
          tenantId: "tenant-b",
        },
      },
    });

    await sqlite.roles.setFilters(role.roleId, ENTITY_ID, {
      users: {
        read: ["email"],
      },
    });

    assertArrayIncludes(
      await sqlite.roles.getRolesByEntityId(ENTITY_ID).then((roles) => roles.map((role) => role.toJSON())),
      [
        {
          roleId: role.roleId,
          tenantId: TENANT_ID,
          name: "admin",
          permissions: {
            users: {
              create: {
                conditions: {
                  tenantId: "tenant-b",
                },
              },
              read: {
                filter: ["email"],
              },
              update: true,
              delete: true,
            },
          },
        },
      ],
    );
  });
});
