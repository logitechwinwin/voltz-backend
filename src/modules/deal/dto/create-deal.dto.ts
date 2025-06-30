import {
  IsString,
  IsDate,
  IsNumber,
  IsArray,
  Length,
  IsNotEmpty,
  Validate,
  IsPositive,
  ArrayMinSize,
  IsEnum,
  IsOptional,
  MinDate,
} from "class-validator";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";
import { CompareDatesConstraint, ComparisonType } from "src/shared/validations/date-comparison.validation";
import { IsDiscountValid } from "src/shared/validations/deal-custom-validation";
import * as moment from "moment";
import { Type } from "class-transformer";

export enum DiscountType {
  FIXED = "fixed",
  PERCENTAGE = "percentage",
}

export class CreateDealDto {
  @Length(2, 255, { message: "Deal Name must be 2 to 255 characters long" })
  @IsString()
  @IsNotEmpty()
  dealName: string;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "banner Image must only contain an image" })
  @IsNotEmpty()
  bannerImage: MemoryStoredFile;

  @IsNotEmpty()
  @IsNumber()
  dealAmount: number;

  @Length(3, 500, { message: "about must be 3 to 500 characters long" })
  @IsString()
  @IsOptional()
  about: string;

  @IsDiscountValid("dealAmount", "discountType", {
    message: "Discount Amount should not exceed deal Amount",
  })
  @IsNotEmpty()
  @IsNumber()
  discountAmount: number;

  @IsEnum(DiscountType, { message: "discountType must be either fixed or percentage" })
  @IsNotEmpty()
  discountType: DiscountType;

  @MinDate(new Date(), {
    message: "from can not be in past",
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  from: Date;

  @Validate(CompareDatesConstraint, ["to", ComparisonType.GreaterThan, "from"])
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  to: Date;

  @IsPositive()
  @IsNotEmpty()
  @IsNumber()
  voltzRequired: number;

  @ArrayMinSize(1, { message: "select at least one product" })
  @IsArray({ message: "Select at least one product" })
  products: number[];

  @ArrayMinSize(1, { message: "Select at least one category" })
  @IsArray({ message: "Select at least one category" })
  category: number[];
}
