import { assertEquals } from "std/assert/mod.ts";
import { beforeEach, describe, it } from "std/testing/bdd.ts";

import type { Role } from "~libraries/role.ts";

import type { SQLiteAuth } from "../../../stores/sqlite.ts";
import type { AppPermissions } from "../helpers/permissions.ts";
import { getSQLiteAuth } from "../helpers/utilities.ts";

const TENANT_ID = "tenant-a";
const ENTITY_ID = "entity-a";

let sqlite: SQLiteAuth<AppPermissions>;
let token: string;

describe("Single Role Access", () => {
  beforeEach(async () => {
    sqlite = getSQLiteAuth();
    token = await sqlite.generate(TENANT_ID, ENTITY_ID);

    await sqlite.roles.addRole({
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
            filter: ["name"],
          },
          update: true,
          delete: true,
        },
      },
    }).then((role) => role.addEntity(ENTITY_ID));
  });

  it("should successfully authorize assigned permissions", async () => {
    const auth = await sqlite.resolve(token);
    assertEquals(auth.access.check("users", "create", { tenantId: TENANT_ID }).granted, true);
    assertEquals(auth.access.check("users", "read").granted, true);
    assertEquals(auth.access.check("users", "update").granted, true);
    assertEquals(auth.access.check("users", "delete").granted, true);
  });

  it("should succesfully filter based on a single assigned role override", async () => {
    const auth = await sqlite.resolve(token);
    assertEquals(
      auth.access.check("users", "read").filter({
        name: "John Doe",
        email: "john.doe@fixture.none",
      }),
      {
        name: "John Doe",
      } as any,
    );
  });
});

describe("Multi Role Access", () => {
  let moderator: Role<AppPermissions>;
  let user: Role<AppPermissions>;

  beforeEach(async () => {
    sqlite = getSQLiteAuth();
    token = await sqlite.generate(TENANT_ID, ENTITY_ID);

    moderator = await sqlite.roles.addRole({
      tenantId: TENANT_ID,
      name: "moderator",
      permissions: {
        users: {
          read: {
            filter: ["name", "email"],
          },
          update: true,
          delete: true,
        },
      },
    });

    await moderator.addEntity(ENTITY_ID);

    user = await sqlite.roles.addRole({
      tenantId: TENANT_ID,
      name: "user",
      permissions: {
        users: {
          read: {
            filter: ["name"],
          },
          update: true,
        },
      },
    });

    await user.addEntity(ENTITY_ID);
  });

  it("should have combined access rights", async () => {
    const auth = await sqlite.resolve(token);
    assertEquals(auth.access.check("users", "create", { tenantId: TENANT_ID }).granted, false);
    assertEquals(auth.access.check("users", "read").granted, true);
    assertEquals(auth.access.check("users", "update").granted, true);
    assertEquals(auth.access.check("users", "delete").granted, true);
  });

  it("should have combined read filters", async () => {
    const auth = await sqlite.resolve(token);
    assertEquals(
      auth.access.check("users", "read").filter({
        name: "John Doe",
        email: "john.doe@fixture.none",
      }),
      {
        name: "John Doe",
        email: "john.doe@fixture.none",
      } as any,
    );
  });

  it("should prioritize entity assignments", async () => {
    await sqlite.roles.setFilters(moderator.roleId, ENTITY_ID, {
      users: {
        read: ["name"],
      },
    });

    const auth = await sqlite.resolve(token);

    assertEquals(
      auth.access.check("users", "read").filter({
        name: "John Doe",
        email: "john.doe@fixture.none",
      }),
      {
        name: "John Doe",
      } as any,
    );
  });
});
