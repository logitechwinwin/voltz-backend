import { IsNotEmpty, IsNumber, IsPositive, IsString } from "class-validator";

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  communityId: number;
}
