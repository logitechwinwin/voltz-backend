import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class GetAllPostsDto {
  @IsString()
  @IsOptional()
  search: string;

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
  @IsNotEmpty()
  communityId: number;

  constructor(partial: Partial<GetAllPostsDto>) {
    Object.assign(this, partial);
  }
}
