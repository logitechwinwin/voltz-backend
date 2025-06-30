import { SetMetadata } from "@nestjs/common";
import { UserRoles } from "src/modules/user/user.entity";

export const ROLES_KEY = "rolesDecorator";
export const RolesDecorator = (...roles: UserRoles[]) => {
  return SetMetadata(ROLES_KEY, roles);
};
