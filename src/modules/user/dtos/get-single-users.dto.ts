import { IsNotEmpty, IsNumber, Validate, ValidateIf } from "class-validator";

export class GetSingleUsersDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;
}
