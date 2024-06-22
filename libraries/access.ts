import { Permission } from "./permission.ts";
import type { Role } from "./role.ts";
import type { GetActionData, Permissions } from "./types.ts";
import { ActionValidator } from "~libraries/types.ts";

export class Access<TPermissions extends Permissions> {
  constructor(
    readonly permissions: TPermissions,
    readonly assignments: Role<TPermissions>[],
  ) {}

  /**
   * Check if the access instance has been assigned permissions for the given
   * resource action pair.
   *
   * @param resource - Resource to check assignment for.
   * @param action   - Action to check assignment for.
   */
  has<
    TResource extends keyof TPermissions,
    TAction extends keyof TPermissions[TResource],
    TData extends GetActionData<TPermissions, TResource, TAction>,
  >(
    ...[resourceId, actionId, data = undefined]: void extends TData ? [resourceId: TResource, actionId: TAction]
      : [resourceId: TResource, actionId: TAction, data: TData]
  ): boolean {
    const validator = this.#getActionValidator(resourceId, actionId);
    return this.assignments.some(({ permissions }) => {
      const resource = permissions[resourceId];
      if (resource === undefined) {
        return false;
      }
      const action = resource[actionId];
      if (action === undefined) {
        return false;
      }
      if (action === true) {
        return true;
      }
      if (validator === undefined) {
        return false;
      }
      const isValid = validator.validate?.(data, action);
      if (isValid === false) {
        return false;
      }
      return true;
    });
  }

  /**
   * Perform a permission check on the given resource, action and potential
   * conditional data to validate.
   *
   * @param resource - Resource to check.
   * @param action   - Action within the resource to validate.
   * @param data     - Conditional data to validate. _(Only required when expected)_
   */
  check<
    TResource extends keyof TPermissions,
    TAction extends keyof TPermissions[TResource],
    TData extends GetActionData<TPermissions, TResource, TAction>,
  >(
    ...[resourceId, actionId, data = undefined]: unknown extends TData ? [resourceId: TResource, actionId: TAction]
      : [resourceId: TResource, actionId: TAction, data: TData]
  ): Permission {
    if (this.has(resourceId, actionId, data!) === false) {
      return new Permission({
        granted: false,
        message: this.#getActionError(resourceId, actionId) ?? "Session is missing one, or more access permissions.",
      });
    }
    return new Permission({
      granted: true,
      filter: this.#getActionFilter(resourceId, actionId),
    });
  }

  /**
   * Get error message defined on the action, or undefined if none has been
   * added to the action.
   *
   * @param resourceId - Resource the action lives under.
   * @param actionId   - Action the error should be registered under.
   */
  #getActionError<TResource extends keyof TPermissions, TAction extends keyof TPermissions[TResource]>(
    resourceId: TResource,
    actionId: TAction,
  ): string | undefined {
    return this.#getActionValidator(resourceId, actionId)?.error;
  }

  /**
   * Get attribute filter defined on the action, or undefined if none has been
   * added to the action.
   *
   * @param resourceId - Resource the action lives under.
   * @param actionId   - Action the filter should be registered under.
   */
  #getActionFilter<TResource extends keyof TPermissions, TAction extends keyof TPermissions[TResource]>(
    resourceId: TResource,
    actionId: TAction,
  ): string[] | undefined {
    return this.#getActionValidator(resourceId, actionId)?.filter;
  }

  /**
   * Get the action validator instance, or undefined if none has been added.
   *
   * @param resourceId - Resource the action lives under.
   * @param actionId   - Action the validator instance should be registered under.
   */
  #getActionValidator<TResource extends keyof TPermissions, TAction extends keyof TPermissions[TResource]>(
    resourceId: TResource,
    actionId: TAction,
  ): ActionValidator<any, any> | undefined {
    const action = this.permissions[resourceId]?.[actionId];
    if (action === undefined || action === true) {
      return undefined;
    }
    return action;
  }
}
