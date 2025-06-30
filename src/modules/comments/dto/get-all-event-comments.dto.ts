import { IsNumber, IsOptional, IsPositive } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class GetAllEventCommentsDto extends GetAllDto {
  @IsPositive()
  @IsNumber()
  @IsOptional()
  eventId: number;
}
