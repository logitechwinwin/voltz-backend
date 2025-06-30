import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { ActivationStatus } from "src/shared/enums";
import { ToBoolean } from "src/utils/booleanTransformer";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class GetAllNgoDto extends GetAllDto {
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
