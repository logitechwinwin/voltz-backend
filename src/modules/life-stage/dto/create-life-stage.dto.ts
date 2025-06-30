import { IsString, Length, Validate } from "class-validator";
import { IsUniqueConstraint } from "src/shared/validations/is-unique.validation";

export class CreateLifeStageDto {
  @Length(2, 127, { message: "label must be between 2 to 127 digits" })
  @IsString()
  label: string;
}
