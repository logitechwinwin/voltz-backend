import { IsBoolean, IsNumber, IsOptional, IsPositive } from "class-validator";
import { ToBoolean } from "src/utils/booleanTransformer";

export class GetAllDto {
  @IsPositive()
  @IsNumber()
  @IsOptional()
  page: number = 1;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  perPage: number = 10;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  userId: number;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  currentMonth?: boolean = false;

  constructor(partial: Partial<GetAllDto>) {
    Object.assign(this, partial);
  }
}
