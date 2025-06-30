import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsNumber, IsPositive, IsString, Length, Matches, Min } from "class-validator";

export class CreateGuestBuysPaymentIntentDto {
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Invalid email format" })
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

  @Length(7, 15, { message: "phoneNumber must be between 7 to 15 digits " })
  @IsString()
  @IsNotEmpty({ message: "Phone number is required" })
  phoneNumber: string;

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
