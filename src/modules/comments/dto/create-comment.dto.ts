import { IsNotEmpty, IsNumber, IsPositive, IsString, Length } from "class-validator";

export class CreateCommentDto {
  @Length(1, 500, {
    message: "Comment must be 1 to 500 characters long",
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  postId: number;
}
