import { IsNotEmpty, IsString, Length } from "class-validator";

export class UpdateCategoryDto {
  @Length(3, 50, { message: "label must be between 3 to 50 digits" })
  @IsString()
  @IsNotEmpty()
  label: string;
}
