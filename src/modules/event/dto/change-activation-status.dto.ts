import { IsEnum, IsNotEmpty, IsString, Length } from "class-validator";
import { ActivationStatus } from "src/shared/enums";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class ChangeActivationStatusDto {
  @Length(2, 255, {
    message: "Reason must be 5 to 255 characters long",
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(ActivationStatus, {
    message: enumErrorMessage("type", ActivationStatus),
  })
  @IsString()
  @IsNotEmpty()
  status: ActivationStatus;
}
