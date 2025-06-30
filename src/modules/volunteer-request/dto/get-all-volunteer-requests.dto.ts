import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { IsEnum, IsNumber, IsOptional, IsPositive } from "class-validator";
import { VolunteerRequestStatus } from "../entities/volunteer-request.entity";

export class GetAllVolunteerRequestDto extends GetAllDto {
  @IsEnum(VolunteerRequestStatus, {
    message: "Invalid status",
  })
  @IsOptional()
  status: VolunteerRequestStatus;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  eventId: number;
}
