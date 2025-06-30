import {
  IsString,
  IsNumber,
  IsDate,
  IsEnum,
  IsNotEmpty,
  Length,
  Matches,
  Min,
  IsEmail,
  ValidateIf,
  MinLength,
  Validate,
  MinDate,
  MaxDate,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { UserRoles } from "src/modules/user/user.entity";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";
import { enumErrorMessage } from "src/utils/enum-err-message";
import { IsUserUnique } from "src/shared/validations/userValidations/is-user-unique.validation";
import * as moment from "moment";

export class UpdateUserKycDto {
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

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "firstName should not contain special characters!",
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "lastName should not contain special characters!",
  })
  @Length(3, 255, {
    message: "Last name must be 3 to 255 characters long",
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "name should not contain special characters!",
  })
  @Length(3, 20, {
    message: "Name must be 3 to 20 characters long",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @Validate(IsUserUnique, ["email"], {
    message: "Email is in use",
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsEmail({}, { message: "Enter Valid email" })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  regNumber: string;

  @MaxDate(
    () => {
      return moment().toDate();
    },
    {
      message: "Date Of Registration cannot be in the future",
    },
  )
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dateOfReg: Date;

  @Matches(/^[a-zA-Z0-9-]{5,20}$/, {
    message: "taxIdentificationNumber should only contain numbers, characters and hyphen (-)",
  })
  @IsString()
  @IsNotEmpty()
  taxIdentificationNumber: string;

  // Address fields
  @MinLength(3, {
    message: "Street address must be 3 characters long",
  })
  @IsString()
  @IsNotEmpty()
  streetAddress: string;

  @MinLength(3, {
    message: "State address must be 3 characters long",
  })
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "State should not contain special characters!",
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "City should not contain special characters!",
  })
  @MinLength(3, {
    message: "City address must be 3 characters long",
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "Country should not contain special characters!",
  })
  @MinLength(3, {
    message: "Country address must be 3 characters long",
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg", "pdf"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg", "application/pdf"])
  @IsFile({ message: "Certificate of reg must only contain files or image" })
  @IsNotEmpty()
  certificateOfReg: MemoryStoredFile;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg", "pdf"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg", "application/pdf"])
  @IsFile({ message: "Csr policy doc must only contain files or image" })
  @IsNotEmpty()
  @ValidateIf((o: UpdateUserKycDto) => o.role !== UserRoles.NGO)
  csrPolicyDoc: MemoryStoredFile;

  @IsEnum(UserRoles, {
    message: enumErrorMessage("role", UserRoles),
  })
  @IsNotEmpty()
  role: UserRoles;
}
