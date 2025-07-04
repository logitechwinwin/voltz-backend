import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @MinLength(6)
  @IsString()
  @IsNotEmpty()
  password: string;

  @MinLength(6)
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
