import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsNotEmpty, IsOptional } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { ToBoolean } from "src/utils/booleanTransformer";

export class GetDealsReportDto extends GetAllDto {
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  endDate: Date;
}
