import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class GetAllChatsForUserDto extends GetAllDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;
}
