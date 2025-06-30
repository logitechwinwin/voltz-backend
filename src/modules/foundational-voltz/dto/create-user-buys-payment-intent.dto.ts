import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Length, Matches, Min } from "class-validator";

export class CreateUserBuysPaymentIntentDto {
  @Min(1, {
    message: "You can purchase not less than 1 voltz",
  })
  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  voltzRequested: number;

  @IsString()
  @IsNotEmpty()
  redirectUrl: string;
}
