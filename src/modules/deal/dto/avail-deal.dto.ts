import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class AvailDealDto {
  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  dealId: number;
}
