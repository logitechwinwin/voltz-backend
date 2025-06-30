import { IsNotEmpty, IsNumber, IsPositive, IsString, isString, Min } from "class-validator";

export class verifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  tokenId: string;
}
