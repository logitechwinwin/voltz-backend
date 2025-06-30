import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class GetYearlyStatsDto {
  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  userId: number;
}
