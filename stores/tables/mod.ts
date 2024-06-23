import type { Repository } from "~libraries/repository.ts";
import { entities } from "./entities/methods.ts";
import { roles } from "./roles/methods.ts";

export const repository = {
  ...entities,
  ...roles,
} satisfies Repository<any>;
