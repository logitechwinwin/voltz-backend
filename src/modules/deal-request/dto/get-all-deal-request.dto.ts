import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { DealRequestStatuses } from "../entities/deal-request.entity";
import { IsDate, IsEnum, IsNumber, IsOptional, IsPositive } from "class-validator";
import { Type } from "class-transformer";

export class GetAllDealRequestDto extends GetAllDto {
  @IsEnum(DealRequestStatuses, {
    message: "Invalid status",
  })
  @IsOptional()
  status: DealRequestStatuses;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  dealId: number;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  from: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  to: Date;
}
