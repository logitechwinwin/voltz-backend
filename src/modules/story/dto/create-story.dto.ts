import { IsNotEmpty, IsOptional, IsString, Length } from "class-validator";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";

export class CreateStoryDto {
  @MaxFileSize(10e8) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg", "mp4"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg", "video/mp4"])
  @IsFile({ message: "Story must contain image or video" })
  @IsNotEmpty()
  storyFile: MemoryStoredFile;

  @Length(2, 255, {
    message: "text must be 1 to 255 characters long",
  })
  @IsString()
  @IsOptional()
  text: string;
}
