import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";
import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";

@ValidatorConstraint({ name: "IsUnique", async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async validate(_: any, args: ValidationArguments) {
    const [entity, properties] = args.constraints;

    // Get the repository for the entity
    const repository = this.entityManager.getRepository(entity);

    // Construct the query based on the properties and their values
    const query = properties.reduce((acc: object, property: string) => {
      acc[property] = (args.object as any)[property];
      return acc;
    }, {});

    // Count the number of records that match the query
    const count = await repository.count({ where: query });

    return count === 0;
  }

  defaultMessage(args: ValidationArguments) {
    const [modelName, properties] = args.constraints;
    return `${properties} already exists`;
  }
}
