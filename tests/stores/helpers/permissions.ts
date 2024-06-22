import { ActionValidator, type Permissions } from "~libraries/types.ts";

export const permissions = {
  users: {
    create: true,
    read: new ActionValidator({
      filter: ["name"],
    }),
    update: true,
    delete: true,
  },
} as const satisfies Permissions;

export type AppPermissions = typeof permissions;
