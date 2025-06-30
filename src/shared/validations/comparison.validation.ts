import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: "ComparisonValidator", async: false })
export class ComparisonValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName, comparisonFn] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    if (typeof comparisonFn === "function") {
      return comparisonFn(value, relatedValue);
    }

    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${relatedPropertyName} and ${args.property} do not match`;
  }
}
