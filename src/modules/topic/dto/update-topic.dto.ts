import { IsNotEmpty, IsString, Length } from "class-validator";

export class UpdateTopicDto {
  @Length(2, 50, { message: "label must be between 2 to 50 digits" })
  @IsString()
  @IsNotEmpty()
  label: string;
}
