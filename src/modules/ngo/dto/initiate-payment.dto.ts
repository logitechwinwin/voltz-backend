import { IsNotEmpty, IsNumber, IsPositive, IsString, isString, Min } from "class-validator";

export class InitiatePaymentDto {
  @Min(1, {
    message: "Donation amount must be equal or more than 1",
  })
  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  voltzRequested: number;

  @IsString()
  @IsNotEmpty()
  redirectUrl: string;
}
