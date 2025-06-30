import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class GetAllDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  page: number = 1;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  perPage: number = 10;

  @IsOptional()
  @IsEnum(["volunteer", "ngo", "company"], {
    message: enumErrorMessage("role", ["volunteer", "ngo", "company"]),
  })
  role?: string;

  constructor(partial: Partial<GetAllDto>) {
    Object.assign(this, partial);
  }
}
