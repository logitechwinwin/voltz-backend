import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { User } from "src/modules/user/user.entity";
import { REQUEST_CONTEXT } from "src/shared/interceptors/inject-user-interceptor";
import { EntityManager } from "typeorm";
import { ExtendedValidationArguments } from "../extended.validation.arguments";

@ValidatorConstraint({ name: "IsUserExists", async: true })
@Injectable()
export class IsUserUnique implements ValidatorConstraintInterface {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async validate(value: any, args: ExtendedValidationArguments) {
    const [property] = args.constraints;
    const currentUser = args?.object[REQUEST_CONTEXT]?.user;

    const user = await this.entityManager.findOne(User, {
      where: { [property]: value },
      withDeleted: true, // Include soft-deleted records
    });

    if (currentUser && user && user.id === currentUser.id && user[property] === currentUser[property]) {
      return true;
    }

    if (user && user.deletedAt) {
      return true;
    }

    if (!user) {
      return true;
    }

    return false;
  }

  defaultMessage(args: ExtendedValidationArguments) {
    return "User already exists";
  }
}
