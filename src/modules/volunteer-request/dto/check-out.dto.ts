import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class CheckOutDto {
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
