import { IsOptional, IsString, Length } from "class-validator";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";

export class UpdateSdgDto {
  @Length(2, 256, { message: "label must be 2 to 256 characters long" })
  @IsString()
  @IsOptional()
  label: string;

  @Length(2, 256, { message: "color must be 2 to 256 characters long" })
  @IsString()
  @IsOptional()
  color: string;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "image must only contains photo" })
  @IsOptional()
  image: MemoryStoredFile;
}
