import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { User } from "src/modules/user/user.entity";
import { EntityManager } from "typeorm";

@ValidatorConstraint({ name: "IsUserExists", async: true })
@Injectable()
export class IsUserExists implements ValidatorConstraintInterface {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async validate(value: any, args: ValidationArguments) {
    const [property] = args.constraints;

    const user = await this.entityManager
      .getRepository(User)
      .createQueryBuilder("user")
      .where({ [property]: value })
      .getOne();

    if (!user) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return "User already exists";
  }
}
