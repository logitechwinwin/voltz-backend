import { Transform } from "class-transformer";
import { ToBoolean } from "src/utils/booleanTransformer";
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { enumErrorMessage } from "src/utils/enum-err-message";
import { ActivationStatus } from "src/shared/enums";

export class GetAllDtoDeals extends GetAllDto {
  @IsNumber()
  @IsOptional()
  companyId: number;

  @IsNumber()
  @IsOptional()
  userId: number;

  @IsNumber({}, { each: true, message: "category must be an array of ids" })
  @Transform(({ value }) => value && value?.map((item: string) => Number(item)))
  @IsArray()
  @IsOptional()
  category: number[];

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  savedDeals: boolean = false;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  onGoing: boolean = false;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  expired: boolean = false;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  upComing: boolean = false;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  popularDeals?: boolean;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  excludeDealId: number;

  @IsEnum(ActivationStatus, {
    message: enumErrorMessage("type", ActivationStatus),
  })
  @IsString()
  @IsOptional()
  activationStatus?: ActivationStatus;
}
