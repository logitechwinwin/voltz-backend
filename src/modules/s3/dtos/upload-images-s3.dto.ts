import { IsNotEmpty } from "class-validator";
import { HasExtension, HasMimeType, IsFiles, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";

export class UploadImagesToS3Dto {
//   @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"], { each: true })
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"], { each: true })
  @IsFiles({ message: "Images must only contain image" })
  @IsNotEmpty()
  images: MemoryStoredFile[];
}
