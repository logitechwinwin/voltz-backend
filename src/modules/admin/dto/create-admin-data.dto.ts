import { Optional } from "@nestjs/common";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  Validate,
} from "class-validator";
import { IsUserUnique } from "src/shared/validations/userValidations/is-user-unique.validation";

export class CreateAdminDto {
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Enter Valid email" })
  @IsNotEmpty()
  email: string;

  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "firstName should not contain special characters!",
  })
  @Length(3, 255, {
    message: "First name must be 3 to 255 characters long",
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "lastName should not contain special characters!",
  })
  @Length(3, 255, {
    message: "Last name must be 3 to 255 characters long",
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @MinLength(6)
  @IsString()
  @IsNotEmpty()
  password: string;

  @Validate(IsUserUnique, ["phoneNumber"], {
    message: "Phone number is in use",
  })
  @Length(7, 15, { message: "phoneNumber must be between 7 to 15 digits " })
  @IsString()
  @IsOptional()
  phoneNumber: string;
}
