import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";

@ValidatorConstraint({ async: false })
export class IsForbiddenIfConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const relatedValue = object[args.constraints[0]];
    console.log("🚀 ~ IsForbiddenIfConstraint ~ validate ~ relatedValue:", relatedValue);

    // If the related field's value matches the forbidden condition and the current field is provided
    if (relatedValue === args.constraints[1] && value !== undefined) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} should not be provided when ${args.constraints[0]} is ${args.constraints[1]}`;
  }
}
