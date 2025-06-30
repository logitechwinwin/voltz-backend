import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength, Validate } from "class-validator";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";
import { IsUserUnique } from "src/shared/validations/userValidations/is-user-unique.validation";

export class CreateCampaignManagerDto {
  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "ProfileImage must only contain image" })
  @IsOptional()
  profileImage: MemoryStoredFile;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "BannerImage must only contain image" })
  @IsOptional()
  bannerImage: MemoryStoredFile;

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

  @Length(7, 15, { message: "phoneNumber must be between 7 to 15 digits " })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
