import { IsNumber, IsOptional, IsPositive } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class GetAllCommentsDto extends GetAllDto {
  @IsPositive()
  @IsNumber()
  @IsOptional()
  postId: number;
}
