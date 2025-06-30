import {
  IsString,
  IsOptional,
  Length,
  IsEmail,
  Validate,
  IsNumber,
  IsArray,
  IsDate,
  MaxDate,
  Matches,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";
import { IsUserUnique } from "src/shared/validations/userValidations/is-user-unique.validation";
import * as moment from "moment";
import { BadRequestException } from "@nestjs/common";
import { UserRoles } from "src/modules/user/user.entity";
import { REQUEST_CONTEXT } from "src/shared/interceptors/inject-user-interceptor";

export class UpdateNgoDto {
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

  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "name should not contain special characters!",
  })
  @Length(3, 20, {
    message: "Name must be 3 to 20 characters long",
  })
  @IsString()
  @IsOptional()
  name: string;

  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "firstName should not contain special characters!",
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

  @Validate(IsUserUnique, ["email"], {
    message: "Email is in use",
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Enter Valid email" })
  @IsOptional()
  email: string;

  @IsNumber({}, { each: true, message: "sdgs must be an array of numbers" })
  @Transform(({ value }) => value.map((item: string) => Number(item)))
  @IsArray()
  @IsOptional()
  sdgs: number[];

  @Length(3, 500, {
    message: "about must be 3 to 500 characters long",
  })
  @IsString()
  @IsOptional()
  about: string;

  @IsOptional()
  _requestContext: any;

  // Admin specific fields
  @ValidateIf((_, value) => {
    const role = _?.[REQUEST_CONTEXT]?.user?.role;
    if (role === UserRoles.NGO && value) {
      throw new BadRequestException("Admin-specific fields are not allowed for NGOs");
    }
    return role === UserRoles.ADMIN;
  })
  @IsOptional()
  @IsString()
  regNumber: string;

  @ValidateIf((_, value) => {
    const role = _?.[REQUEST_CONTEXT]?.user?.role;
    if (role === UserRoles.NGO && value) {
      throw new BadRequestException("Admin-specific fields are not allowed for NGOs");
    }
    return role === UserRoles.ADMIN;
  })
  @IsOptional()
  @MaxDate(() => moment().toDate(), {
    message: "Date Of Registration cannot be in the future",
  })
  @Type(() => Date)
  @IsDate()
  dateOfReg: Date;

  @ValidateIf((_, value) => {
    const role = _?.[REQUEST_CONTEXT]?.user?.role;
    if (role === UserRoles.NGO && value) {
      throw new BadRequestException("Admin-specific fields are not allowed for NGOs");
    }
    return role === UserRoles.ADMIN;
  })
  @IsOptional()
  @Matches(/^[a-zA-Z0-9-]{5,20}$/, {
    message: "taxIdentificationNumber should only contain numbers, characters and hyphen (-)",
  })
  @IsString()
  taxIdentificationNumber: string;

  // Address fields
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

  @ValidateIf((_, value) => {
    const role = _?.[REQUEST_CONTEXT]?.user?.role;
    if (role === UserRoles.NGO && value) {
      throw new BadRequestException("Admin-specific fields are not allowed for NGOs");
    }
    return role === UserRoles.ADMIN;
  })
  @IsOptional()
  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg", "pdf"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg", "application/pdf"])
  @IsFile({ message: "Certificate of reg must only contain files or image" })
  certificateOfReg: MemoryStoredFile;

  constructor(partial: Partial<UpdateNgoDto>) {
    Object.assign(this, partial);
  }
}
