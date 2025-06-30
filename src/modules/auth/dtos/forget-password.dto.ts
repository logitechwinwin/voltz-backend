import { Transform } from "class-transformer";
import { IsNotEmpty, IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Enter Valid email" })
  @IsNotEmpty()
  email: string;
}
