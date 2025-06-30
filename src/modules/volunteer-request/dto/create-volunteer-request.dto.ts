import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class CreateVolunteerRequestDto {
  @IsNotEmpty()
  @IsNumber()
  eventId: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quotedHours: number;
}
