import { IsEnum, IsNotEmpty, IsNumber, IsPositive, ValidateIf } from "class-validator";
import { VolunteerRequestStatus } from "../entities/volunteer-request.entity";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class UpdateVolunteerRequestStatusDto {
  @IsEnum(VolunteerRequestStatus, {
    message: enumErrorMessage("status", VolunteerRequestStatus),
  })
  @IsNotEmpty()
  status: VolunteerRequestStatus;

  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => o.status === VolunteerRequestStatus.ACCEPTED)
  actualHours: number;
}
