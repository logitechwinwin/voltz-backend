import { IsEnum, IsNotEmpty } from "class-validator";
import { RegistrationStatus } from "./../../user/user.entity";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class ApproveUserKycDto {
  @IsEnum(RegistrationStatus, {
    message: enumErrorMessage("registrationStatus", RegistrationStatus),
  })
  @IsNotEmpty()
  registrationStatus: RegistrationStatus;
}
