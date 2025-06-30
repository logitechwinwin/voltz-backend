import { IsNotEmpty, IsString, Length, Validate } from "class-validator";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";
import { IsUniqueConstraint } from "src/shared/validations/is-unique.validation";

export class CreateSdgDto {
  @Validate(IsUniqueConstraint, ["sdg", ["label"]])
  @Length(2, 256, { message: "label must be 2 to 256 characters long" })
  @IsString()
  @IsNotEmpty()
  label: string;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "image must only contains image" })
  @IsNotEmpty()
  image: MemoryStoredFile;
}
