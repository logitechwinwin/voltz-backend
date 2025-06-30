import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Transform, Type } from "class-transformer";
import { ActivationStatus } from "src/shared/enums";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class GetAllVolunteersDto extends GetAllDto {
  @IsNumber({}, { each: true, message: "sdgs must be an array of ids" })
  @Transform(({ value }) => value.map((item: string) => Number(item)))
  @IsArray()
  @IsOptional()
  sdgs?: number[];

  @IsEnum(ActivationStatus, {
    message: enumErrorMessage("type", ActivationStatus),
  })
  @IsString()
  @IsOptional()
  activationStatus?: ActivationStatus;
}
