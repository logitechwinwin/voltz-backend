import { IsEnum, IsNumber, IsOptional, IsPositive } from "class-validator";

export enum FilterStatus {
  EARNED = "earned",
  SPENT = "spent",
  ALL = "all",
}

export class GetVoltzHistoryStatsDto {
  @IsEnum(FilterStatus)
  @IsOptional()
  status: FilterStatus;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  page: number = 1;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  perPage: number = 10;
}
