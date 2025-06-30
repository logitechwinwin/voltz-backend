import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { ToBoolean } from "src/utils/booleanTransformer";
import { Transform, Type } from "class-transformer";
import { ActivationStatus } from "src/shared/enums";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class GetAllCompaniesDto extends GetAllDto {
  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  byUserInterest: boolean;

  @IsString()
  @IsOptional()
  location: string;

  @IsNumber()
  @IsOptional()
  userId: number;

  @IsNumber({}, { each: true, message: "sdgs must be an array of ids" })
  @Transform(({ value }) => value.map((item: string) => Number(item)))
  @IsArray()
  @IsOptional()
  sdgs: number[];

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  exceedFollowed: boolean = true;

  @IsEnum(ActivationStatus, {
    message: enumErrorMessage("type", ActivationStatus),
  })
  @IsString()
  @IsOptional()
  activationStatus?: ActivationStatus;
}
