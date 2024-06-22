import type { TypeOf, ZodTypeAny } from "zod";

import type { Role } from "~libraries/role.ts";

/*
 |--------------------------------------------------------------------------------
 | Roles
 |--------------------------------------------------------------------------------
 */

export type RoleRepository<TPermissions extends Permissions> = {
  /**
   * Add a new role to the persistence storage.
   *
   * @param payload - Role to add to the database.
   */
  addRole(payload: RolePayload<TPermissions>): Promise<Role<TPermissions>>;

  /**
   * Get a role from the persisted storage.
   *
   * @param roleId - Role id to get from the database.
   */
  getRole(roleId: string): Promise<Role<TPermissions> | undefined>;

  /**
   * Get roles for a user under the given tenant.
   *
   * @param tenantId - Tenant the assignment resides under.
   * @param entityId - Entity to get permissions for.
   */
  getRoles(tenantId: string, entityId: string): Promise<Role<TPermissions>[]>;

  /**
   * Get all roles created for a specific tenant.
   *
   * @param tenantId - Tenant to retrieve roles for.
   */
  getRolesByTenantId(tenantId: string): Promise<Role<TPermissions>[]>;

  /**
   * Get all roles assigned to a specific user.
   *
   * @param entityId - Entity to retrieve roles for.
   */
  getRolesByUserId(entityId: string): Promise<Role<TPermissions>[]>;

  /**
   * Add user to an existing role.
   *
   * @param roleId     - Role to assign the user to.
   * @param entityId   - Entity to assign to the role.
   * @param conditions - Unique conditions to apply to the role. _(Optional)_
   */
  addEntity(roleId: string, entityId: string, conditions?: any): Promise<void>;

  /**
   * Remove a user from an existing role.
   *
   * @param roleId   - Role to remove the user from.
   * @param entityId - Entity to remove from the role.
   */
  delEntity(roleId: string, entityId: string): Promise<void>;

  /**
   * Update a role with the provided grant and ungrant operations.
   *
   * @param roleId     - Role id to update.
   * @param operations - Grant and ungrant operations to execute.
   */
  setPermissions(roleId: string, operations: Operation[]): Promise<RolePermissions<TPermissions>>;
};

/**
 * Role permissions creates a map of resource action values. Mapping conditional
 * actions to its conditions value, or true as it is stored in the database.
 */
export type RolePermissions<TPermissions extends Permissions> = Partial<
  {
    /**
     * Resource the role has access to as defined in the permissions of the role
     * storage solution.
     */
    [TResource in keyof TPermissions]: Partial<
      {
        /**
         * Action within the given resource the role can perform. Houses either a
         * conditional value, or true.
         */
        [TAction in keyof TPermissions[TResource]]: TPermissions[TResource][TAction] extends
          { conditions: infer TConditions } ? TConditions extends ZodTypeAny ? TypeOf<TConditions> : never : true;
      }
    >;
  }
>;

export type RolePayload<TPermissions extends Permissions> = {
  tenantId: string;
  name: string;
  permissions: RolePermissions<TPermissions>;
};

export type RoleData<TPermissions extends Permissions> = {
  roleId: string;
  tenantId: string;
  name: string;
  permissions: RolePermissions<TPermissions>;
};

/*
 |--------------------------------------------------------------------------------
 | Permissions
 |--------------------------------------------------------------------------------
 */

/**
 * Permission defines a structure for managing access control within an application.
 * It combines Role-Based Access Control (RBAC) with Attribute-Based Access Control
 * (ABAC) elements, allowing for flexible and granular control over user permissions.
 *
 * In this model, roles are configured separately from the permissions and are used
 * to compile a comprehensive permission set for each user request. This allows the
 * system to evaluate combined permissions dynamically.
 *
 * The conditions in this structure represent specific attributes or constraints for
 * more granular access control.
 *
 * @example
 * const permissions = {
 *   document: {
 *     create: true,
 *     read: new ActionValidator({
         data: z.array(z.string()),
         conditions: z.object({
           attributes: z.array(z.string()),
         }),
         validate: (data, conditions) => {
           return data.every((attr) => conditions.attributes.includes(attr));
         },
         error: "Does not have permission to read document",
       }),
 *     update: true,
 *     delete: true,
 *   },
 * } as const satisfies Permission;
 */
export type Permissions<TPermissions extends Record<string, any> = Record<string, any>> = {
  /**
   * A resource representing an entity or category that can be associated with a
   * collection of actions.
   *
   * In the context of RBAC, this serves as an identifier for resources like
   * documents, profiles, etc.
   */
  [TResource in keyof TPermissions]: {
    /**
     * An action representing a specific operation or behavior that can be
     * performed on a resource.
     */
    [TAction in keyof TPermissions[TResource]]: TPermissions[TResource][TAction] extends ActionValidator<any, any>
      ? ActionValidator<any, any>
      : true;
  };
};

/**
 * Retrieve the data defined on the given resource action.
 *
 * For an action that has conditional configuration the defined data key is
 * returned, else void is presented.
 */
export type GetActionData<
  TPermissions extends Permissions,
  TResource extends keyof TPermissions,
  TAction extends keyof TPermissions[TResource],
> = TPermissions[TResource][TAction] extends { data: infer TData extends ZodTypeAny } ? TypeOf<TData> : void;

/**
 * Retrieve the conditions defined on the given resource action.
 *
 * For an action that has conditional configuration the defined conditions key is
 * returned, else void is presented.
 */
export type GetActionConditions<
  TPermissions extends Permissions,
  TResource extends keyof TPermissions,
  TAction extends keyof TPermissions[TResource],
> = TPermissions[TResource][TAction] extends { conditions: infer TConditions extends ZodTypeAny } ? TypeOf<TConditions>
  : void;

/**
 * Conditions under which an action can be performed, allowing for detailed
 * attribute-based control.
 */
export class ActionValidator<TData extends ZodTypeAny, TConditions extends ZodTypeAny> {
  readonly data?: TData;
  readonly conditions?: TConditions;
  readonly validate?: ConditionFn<TData, TConditions>;
  readonly error?: string;
  readonly filter?: string[];

  constructor(
    options: ActionValidatorOptions<TData, TConditions>,
  ) {
    this.data = options.data;
    this.conditions = options.conditions;
    this.validate = options.validate;
    this.error = options.error;
    this.filter = options.filter;
  }
}

type ActionValidatorOptions<TData extends ZodTypeAny, TConditions extends ZodTypeAny> = Partial<{
  data: TData;
  conditions: TConditions;
  validate: ConditionFn<TData, TConditions>;
  error: string;
  filter: string[];
}>;

/**
 * Condition function used to validate incoming data with the conditions
 * object defined on a permission action.
 *
 * @param data       - Incoming data to validate against the conditions.
 * @param conditions - Conditional data as stored on the permission instance.
 */
export type ConditionFn<TData extends ZodTypeAny, TConditions extends ZodTypeAny> = (
  data: TypeOf<TData>,
  conditions: TypeOf<TConditions>,
) => boolean;

/**
 * Type defenitions detailing the operation structure of updating a roles
 * permissions layers. This provides the ability for service providers to take
 * a operation set and create its own insert logic.
 */
export type Operation =
  | SetOperation
  | UnsetOperation;

type SetOperation = {
  type: "set";
  resource: string;
  action: string;
  data?: Record<string, unknown>;
};

type UnsetOperation = {
  type: "unset";
  resource: string;
  action?: string;
};
