import { IsNumber, IsOptional, IsPositive } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class GetAllActivationChangeLogDto extends GetAllDto {
  @IsPositive()
  @IsNumber()
  @IsOptional()
  eventId?: number;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  dealId?: number;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  communityId?: number;
}
