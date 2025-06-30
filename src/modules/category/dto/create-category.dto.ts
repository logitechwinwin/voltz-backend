import { IsString, Length, Validate } from "class-validator";
import { IsUniqueConstraint } from "src/shared/validations/is-unique.validation";

export class CreateCategoryDto {
  @Length(3, 127, { message: "label must be between 3 to 127 digits" })
  @IsString()
  label: string;
}
