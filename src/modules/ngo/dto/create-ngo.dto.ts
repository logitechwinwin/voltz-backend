import { IsString, IsNotEmpty, Length, IsEmail, Validate, IsOptional, Matches } from "class-validator";
import { Transform, Type } from "class-transformer";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";
import { IsUserUnique } from "src/shared/validations/userValidations/is-user-unique.validation";

export class CreateNgoDto {
  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "ProfileImage must only contain image" })
  @IsNotEmpty()
  profileImage: MemoryStoredFile;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "ProfileImage must only contain image" })
  @IsNotEmpty()
  bannerImage: MemoryStoredFile;

  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "firstName should not contain special characters!",
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

  @Validate(IsUserUnique, ["email"], {
    message: "Email is in use",
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Enter Valid email" })
  @IsNotEmpty()
  email: string;

  @IsOptional()
  _requestContext: any;
}
