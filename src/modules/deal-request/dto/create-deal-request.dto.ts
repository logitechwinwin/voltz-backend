import { IsNotEmpty, IsNumber } from "class-validator";

export class CreateDealRequestDto {
  @IsNumber()
  @IsNotEmpty()
  dealId: number;

  @IsNumber()
  @IsNotEmpty()
  transactionId: number;
}
