import { IsEnum, IsNotEmpty, IsNumber, Validate, ValidateIf } from "class-validator";
import { enumErrorMessage } from "src/utils/enum-err-message";

export enum StatsDuration {
  "1M" = "1M",
  "3M" = "3M",
  "6M" = "6M",
  "1Y" = "1Y",
  "ALL" = "all",
}

export class GetUsersSdgsStats {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsEnum(StatsDuration, {
    message: enumErrorMessage("status", StatsDuration),
  })
  @IsNotEmpty()
  duration: StatsDuration;
}
