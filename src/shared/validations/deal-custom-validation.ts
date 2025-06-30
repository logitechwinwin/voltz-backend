import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { DiscountType } from "src/modules/deal/dto/create-deal.dto";

@ValidatorConstraint({ async: false })
export class IsDiscountValidConstraint implements ValidatorConstraintInterface {
  validate(discountAmount: number, args: ValidationArguments) {
    const [dealAmountProperty, discountTypeProperty] = args.constraints;
    const dealAmount = (args.object as any)[dealAmountProperty];
    const discountType = (args.object as any)[discountTypeProperty];

    if (discountType === DiscountType.FIXED) {
      // For fixed discounts, ensure discountAmount is not greater than dealAmount
      return discountAmount <= dealAmount;
    } else if (discountType === DiscountType.PERCENTAGE) {
      // For percentage discounts, ensure discountAmount does not exceed 100%
      return discountAmount <= 100;
    }

    // If discountType is neither, return false to indicate invalidity
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const discountType = (args.object as any)[args.constraints[1]];
    if (discountType === DiscountType.FIXED) {
      return "Discount amount ($value) should not be greater than the deal amount";
    } else if (discountType === DiscountType.PERCENTAGE) {
      return "Discount percentage ($value%) should not exceed 100%";
    }
    return "Invalid discount type";
  }
}

export function IsDiscountValid(
  dealAmountProperty: string,
  discountTypeProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [dealAmountProperty, discountTypeProperty],
      validator: IsDiscountValidConstraint,
    });
  };
}
