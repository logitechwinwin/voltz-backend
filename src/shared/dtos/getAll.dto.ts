import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Max } from "class-validator";

export class GetAllDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  // @Max(1000, { message: "Per page can't be more than 1000 records" })
  @IsPositive()
  @IsNumber()
  @IsOptional()
  perPage?: number = 10;

  constructor(partial: Partial<GetAllDto>) {
    Object.assign(this, partial);
  }
}
