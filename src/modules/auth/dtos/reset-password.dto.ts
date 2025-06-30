import { IsNotEmpty, IsString, IsNumber, MinLength, ValidateIf, IsOptional } from "class-validator";

export class ResetPasswordDto {
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf((o: ResetPasswordDto) => {
    if (!o.userToken) {
      return true;
    }
  })
  otpId: number;

  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsString()
  @IsOptional()
  userToken: string;
}
