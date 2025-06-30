import { IsNotEmpty, IsString, Length } from "class-validator";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";

export class CreateCommunityDto {
  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "bannerImage must only contains image" })
  @IsNotEmpty()
  bannerImage: MemoryStoredFile;

  @Length(2, 255, {
    message: "title must be 2 to 255 characters long",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
