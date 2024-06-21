import { Permission } from "./permission.ts";
import type { Role } from "./role.ts";
import type { GetActionData, Permissions, Roles } from "./types.ts";

export class Access<TPermissions extends Permissions> {
  constructor(
    readonly permissions: TPermissions,
    readonly roles: Roles<TPermissions>,
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
    const resource = this.permissions[resourceId];
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
    const isValid = action.validate(data, {});
    if (isValid === false) {
      return false;
    }
    return true;
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
    const resource = this.permissions[resourceId];
    if (resource === undefined) {
      return new Permission({
        granted: false,
        message: `Session is not allowed to operate on ${String(resourceId)} resource.`,
      });
    }
    const action = resource[actionId];
    if (action === undefined) {
      return new Permission({
        granted: false,
        message: `Session is not allowed to execute ${String(actionId)} action on ${String(resourceId)} resource.`,
      });
    }
    if (action === true) {
      return new Permission({ granted: true });
    }
    const isValid = action.validate(data, {});
    if (isValid === false) {
      return new Permission({ granted: false, message: action.error });
    }
    return new Permission({ granted: true });
  }
}
