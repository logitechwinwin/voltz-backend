import { Transform } from "class-transformer";
import { IsNotEmpty, IsNumber, IsPositive, IsString, Length, Matches } from "class-validator";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";

export class CreateProductDto {
  @Transform(({ value }) => `${value?.slice(0, 1)?.toUpperCase()}${value?.slice(1)?.toLowerCase()}`)
  @Matches(/^[^!@#$%^&*()?:{}|<>]*$/, {
    message: "name should not contain special characters!",
  })
  @Length(3, 255, { message: "title must be 3 to 255 characters long" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @Length(3, 500, { message: "description must be 3 to 500 characters long" })
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "Image must only contains image" })
  @IsNotEmpty()
  image: MemoryStoredFile;
}
