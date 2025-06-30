import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, MinLength, ValidateIf } from "class-validator";
import { enumErrorMessage } from "src/utils/enum-err-message";
import { LoginType } from "../entities/login-attempt.entity";
import { Transform } from "class-transformer";

export enum UserRoles {
  VOLUNTEER = "volunteer",
  PANEl = "panel",
}

export class SignInUserDto {
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Enter Valid email" })
  @IsNotEmpty({ message: "Email should not be empty" })
  @ValidateIf((o: SignInUserDto) => {
    if (!o.loginType) {
      return true;
    }
    if (
      (!o.phoneNumber && o.loginType !== LoginType.PHONE_NUMBER && o.email) ||
      (o.loginType === LoginType.PHONE_NUMBER && o.email)
    ) {
      return true;
    }
  })
  email: string;

  @Length(7, 15, { message: "phoneNumber must be between 7 to 15 digits " })
  @IsString()
  @IsNotEmpty({ message: "Phone number is required" })
  @ValidateIf((o: SignInUserDto) => o.loginType && o.loginType !== LoginType.EMAIL)
  phoneNumber: string;

  @MinLength(6)
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(UserRoles, {
    message: enumErrorMessage("role", UserRoles),
  })
  @IsNotEmpty()
  role: string;

  @IsEnum(LoginType, {
    message: enumErrorMessage("loginType", LoginType),
  })
  @IsNotEmpty()
  loginType: string;

  @IsString()
  @IsOptional()
  deviceToken: string;
}
