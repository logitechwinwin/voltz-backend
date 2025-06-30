import { IsNotEmpty, IsNumber } from "class-validator";

export class RegisterForEventDto {
  @IsNotEmpty()
  @IsNumber()
  eventId: number;
}
