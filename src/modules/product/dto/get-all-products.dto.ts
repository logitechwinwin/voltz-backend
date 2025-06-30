import { IsNumber, IsOptional, IsPositive } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class GetAllProductsDto extends GetAllDto {
  @IsPositive()
  @IsNumber()
  @IsOptional()
  userId: number;
}
