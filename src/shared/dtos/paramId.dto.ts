import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class ParamIdDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;
}
