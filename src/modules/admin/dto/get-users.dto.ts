import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { enumErrorMessage } from "src/utils/enum-err-message";
import { RegistrationStatus, UserRoles } from "src/modules/user/user.entity";
import { ActivationStatus } from "src/shared/enums";

export class GetUsersDto {
  @IsEnum(RegistrationStatus, {
    message: enumErrorMessage("registrationStatus", RegistrationStatus),
  })
  @IsOptional()
  registrationStatus: RegistrationStatus;

  @IsEnum(UserRoles, {
    message: enumErrorMessage("role", UserRoles),
  })
  @IsOptional()
  role: UserRoles;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  page: number = 1;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  perPage: number = 10;

  @IsEnum(ActivationStatus, {
    message: enumErrorMessage("type", ActivationStatus),
  })
  @IsString()
  @IsOptional()
  activationStatus: ActivationStatus;
}
