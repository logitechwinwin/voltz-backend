import { Transform } from "class-transformer";
import { IsNotEmpty, IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class VerifyOtpDto {
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Enter Valid email" })
  @IsNotEmpty()
  email: string;

  @MinLength(6)
  @MaxLength(6)
  @IsString()
  @IsNotEmpty()
  otp: string;
}
