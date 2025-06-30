import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";
import * as moment from "moment";
import { formatErrorMessage } from "src/utils/formate-error-message";

export enum ComparisonType {
  GreaterThan = "greaterThan",
  LessThan = "lessThan",
  Equal = "equal",
  GreaterThanOrEqual = "greaterThanOrEqual",
  LessThanOrEqual = "lessThanOrEqual",
}

@ValidatorConstraint({ async: false })
export class CompareDatesConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const [propertyName, comparisonType, relatedPropertyName] = args.constraints;

    const date = (args.object as any)[propertyName];
    const relatedDate = (args.object as any)[relatedPropertyName];

    if (!relatedDate || !date) return true; // handle null or undefined dates

    switch (comparisonType) {
      case ComparisonType.GreaterThan:
        return moment(date).isAfter(moment(relatedDate));
      case ComparisonType.LessThan:
        return moment(date).isBefore(moment(relatedDate));
      case ComparisonType.Equal:
        return moment(date).isSame(moment(relatedDate));
      case ComparisonType.GreaterThanOrEqual:
        return moment(date).isSameOrAfter(moment(relatedDate));
      case ComparisonType.LessThanOrEqual:
        return moment(date).isSameOrBefore(moment(relatedDate));
      default:
        return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const [propertyName, comparisonType, relatedPropertyName] = args.constraints;
    return `${propertyName} must be ${formatErrorMessage(comparisonType)} ${formatErrorMessage(relatedPropertyName)}`;
  }
}
