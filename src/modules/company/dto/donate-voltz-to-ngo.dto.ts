import { IsInt, IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class DonateVoltzToNgoDto {
  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  ngoId: number;

  @IsPositive()
  @IsInt()
  @IsNotEmpty()
  numberOfVoltz: number;
}
