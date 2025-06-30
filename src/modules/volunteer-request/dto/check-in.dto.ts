import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class CheckInDto {
  @IsPositive()
  @IsNotEmpty()
  @IsNumber()
  eventId: number;

  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}
