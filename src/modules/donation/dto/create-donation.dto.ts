import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, isString, Min } from "class-validator";

export class CreateDonationDto {
  @IsPositive()
  @IsInt()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  eventId: number;

  @IsString()
  @IsNotEmpty()
  redirectUrl: string;
}
