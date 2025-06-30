import { IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class GetAllDonationDto extends GetAllDto {
  @IsPositive()
  @IsNumber()
  @IsOptional()
  eventId: number;
}
