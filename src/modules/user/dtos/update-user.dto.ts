import { Transform } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsNumber,
  IsString,
  Length,
  MinLength,
  Validate,
  IsUrl,
  IsNumberString,
  Matches,
} from "class-validator";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";
import { IsUserUnique } from "src/shared/validations/userValidations/is-user-unique.validation";

export class UpdateUserDto {
  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "ProfileImage must only contain image" })
  @IsOptional()
  profileImage: MemoryStoredFile;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "ProfileImage must only contain image" })
  @IsOptional()
  bannerImage: MemoryStoredFile;

  @Validate(IsUserUnique, ["email"], {
    message: "Email is in use",
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Enter Valid email" })
  @IsOptional()
  email: string;

  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "firstName should not contain special characters!",
  })
  @Length(3, 255, {
    message: "First name must be 3 to 255 characters long",
  })
  @IsString()
  @IsOptional()
  firstName: string;

  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "lastName should not contain special characters!",
  })
  @Length(3, 255, {
    message: "Last name must be 3 to 255 characters long",
  })
  @IsString()
  @IsOptional()
  lastName: string;

  @Validate(IsUserUnique, ["phoneNumber"], {
    message: "Phone number is in use",
  })
  @Length(7, 15, { message: "phoneNumber must be between 7 to 15 digits " })
  @IsString()
  // @IsNumberString({}, { message: "Phone number must contain only digits" })
  @IsOptional()
  phoneNumber: string;

  @IsNumber({}, { each: true, message: "sdgs must be an array of numbers" })
  @IsArray()
  @Transform(({ value }) => {
    return value?.map((item: string) => Number(item));
  })
  @IsOptional()
  sdgs: number[];

  @MinLength(3, {
    message: "Street address must be 3 characters long",
  })
  @IsString()
  @IsOptional()
  streetAddress: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "State should not contain special characters!",
  })
  @MinLength(3, {
    message: "State address must be 3 characters long",
  })
  @IsString()
  @IsOptional()
  state: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "City should not contain special characters!",
  })
  @MinLength(3, {
    message: "City address must be 3 characters long",
  })
  @IsString()
  @IsOptional()
  city: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "Country should not contain special characters!",
  })
  @MinLength(3, {
    message: "Country address must be 3 characters long",
  })
  @IsString()
  @IsOptional()
  country: string;

  @IsString()
  @IsOptional()
  postalCode: string;

  @IsUrl()
  @IsString()
  @IsOptional()
  facebookUrl: string;

  @IsUrl()
  @IsString()
  @IsOptional()
  twitterUrl: string;

  @IsUrl()
  @IsString()
  @IsOptional()
  linkedinUrl: string;

  @IsUrl()
  @IsString()
  @IsOptional()
  youtubeUrl: string;

  @IsOptional()
  _requestContext: any;

  @Length(0, 500)
  @IsString()
  @IsOptional()
  about?: string;
}
